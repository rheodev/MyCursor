/**
 * useAutoLogin Hook
 * 提供自动登录功能的公共逻辑
 */

import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { logger } from '../utils/logger';
import { handleApiError } from '../utils/errorHandler';

export interface AutoLoginOptions {
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
  timeout?: number; // 超时时间（毫秒），默认30秒
}

export interface AutoLoginState {
  loading: boolean;
  showCancelButton: boolean;
  showLoginWindow: boolean;
  timeout: boolean;
}

export interface AutoLoginActions {
  startAutoLogin: (email: string, password: string, showWindow?: boolean) => Promise<void>;
  cancelAutoLogin: () => Promise<void>;
  showWindow: () => Promise<void>;
}

/**
 * useAutoLogin - 自动登录Hook
 * 
 * @example
 * const { state, actions } = useAutoLogin({
 *   onSuccess: (token) => console.log('登录成功', token),
 *   onError: (error) => console.error('登录失败', error),
 * });
 * 
 * // 开始自动登录
 * await actions.startAutoLogin('user@example.com', 'password');
 */
export const useAutoLogin = (options: AutoLoginOptions = {}) => {
  const {
    onSuccess,
    onError,
    timeout = 30000, // 默认30秒
  } = options;

  // 状态管理
  const [state, setState] = useState<AutoLoginState>({
    loading: false,
    showCancelButton: false,
    showLoginWindow: false,
    timeout: false,
  });

  // 引用管理
  const timeoutTimerRef = useRef<number | null>(null);
  const unlistenersRef = useRef<UnlistenFn[]>([]);
  const currentEmailRef = useRef<string>('');

  /**
   * 清理监听器和定时器
   */
  const cleanup = useCallback(() => {
    // 清理定时器
    if (timeoutTimerRef.current) {
      window.clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    // 清理事件监听器
    unlistenersRef.current.forEach(unlisten => unlisten());
    unlistenersRef.current = [];

    logger.debug('自动登录清理完成');
  }, []);

  /**
   * 设置事件监听器
   */
  const setupListeners = useCallback(async () => {
    try {
      // 监听登录成功事件
      const successUnlisten = await listen<{ token: string }>(
        'auto-login-success',
        (event) => {
          logger.info('自动登录成功', { email: currentEmailRef.current });
          
          cleanup();
          setState(prev => ({
            ...prev,
            loading: false,
            showCancelButton: false,
            timeout: false,
          }));

          if (onSuccess && event.payload?.token) {
            onSuccess(event.payload.token);
          }
        }
      );

      // 监听登录失败事件
      const failedUnlisten = await listen<{ error?: string }>(
        'auto-login-failed',
        (event) => {
          logger.error('自动登录失败', { 
            email: currentEmailRef.current,
            error: event.payload?.error 
          });

          cleanup();
          setState(prev => ({
            ...prev,
            loading: false,
            showCancelButton: false,
            timeout: false,
          }));

          if (onError) {
            onError(event.payload?.error || '自动登录失败');
          }
        }
      );

      unlistenersRef.current = [successUnlisten, failedUnlisten];
    } catch (error) {
      logger.error('设置监听器失败', { error });
    }
  }, [cleanup, onSuccess, onError]);

  /**
   * 开始自动登录
   */
  const startAutoLogin = useCallback(async (
    email: string,
    password: string,
    showWindow: boolean = false
  ) => {
    try {
      currentEmailRef.current = email;

      // 设置事件监听器
      await setupListeners();

      // 更新状态
      setState({
        loading: true,
        showCancelButton: false,
        showLoginWindow: showWindow,
        timeout: false,
      });

      logger.info('开始自动登录', { email, showWindow });

      // 触发自动登录
      await invoke('auto_login_and_get_cookie', {
        email,
        password,
        showWindow,
      });

      // 设置超时定时器
      timeoutTimerRef.current = window.setTimeout(() => {
        logger.warn('自动登录超时');
        setState(prev => ({
          ...prev,
          timeout: true,
          showCancelButton: true,
        }));
      }, timeout);

      // 3秒后显示取消按钮
      window.setTimeout(() => {
        setState(prev => ({
          ...prev,
          showCancelButton: prev.loading, // 只有还在loading时才显示
        }));
      }, 3000);

    } catch (error) {
      const errorResponse = handleApiError(error, '自动登录');
      cleanup();
      setState({
        loading: false,
        showCancelButton: false,
        showLoginWindow: false,
        timeout: false,
      });

      if (onError) {
        onError(errorResponse.message || '自动登录失败');
      }
    }
  }, [setupListeners, timeout, onError, cleanup]);

  /**
   * 取消自动登录
   */
  const cancelAutoLogin = useCallback(async () => {
    try {
      logger.info('用户取消自动登录');

      await invoke('auto_login_failed', { error: '用户手动取消' });
      
      cleanup();
      setState({
        loading: false,
        showCancelButton: false,
        showLoginWindow: false,
        timeout: false,
      });
    } catch (error) {
      logger.error('取消自动登录失败', { error });
    }
  }, [cleanup]);

  /**
   * 显示登录窗口
   */
  const showWindowAction = useCallback(async () => {
    try {
      await invoke('show_auto_login_window');
      logger.info('显示自动登录窗口');
    } catch (error) {
      logger.error('显示窗口失败', { error });
      if (onError) {
        onError('显示窗口失败，可能窗口已关闭');
      }
    }
  }, [onError]);

  return {
    state,
    actions: {
      startAutoLogin,
      cancelAutoLogin,
      showWindow: showWindowAction,
    },
  };
};
