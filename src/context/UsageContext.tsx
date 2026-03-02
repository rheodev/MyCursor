import React, { createContext, useContext, useReducer, ReactNode, useMemo, useCallback } from "react";
import type { AggregatedUsageData } from "../types/usage";

// State 类型定义
interface UsageState {
  usageData: Record<string, AggregatedUsageData>; // key: token
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  lastFetch: Record<string, number>;
}

// Action 类型定义
type UsageAction =
  | { type: "SET_LOADING"; payload: { token: string; loading: boolean } }
  | {
      type: "SET_USAGE_DATA";
      payload: { token: string; data: AggregatedUsageData };
    }
  | { type: "SET_ERROR"; payload: { token: string; error: string | null } }
  | { type: "CLEAR_TOKEN_DATA"; payload: { token: string } }
  | { type: "CLEAR_ALL_DATA" };

const initialState: UsageState = {
  usageData: {},
  loading: {},
  error: {},
  lastFetch: {},
};

// Reducer
const usageReducer = (state: UsageState, action: UsageAction): UsageState => {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.token]: action.payload.loading,
        },
        error: { ...state.error, [action.payload.token]: null },
      };
    case "SET_USAGE_DATA":
      return {
        ...state,
        usageData: {
          ...state.usageData,
          [action.payload.token]: action.payload.data,
        },
        loading: { ...state.loading, [action.payload.token]: false },
        error: { ...state.error, [action.payload.token]: null },
        lastFetch: { ...state.lastFetch, [action.payload.token]: Date.now() },
      };
    case "SET_ERROR":
      return {
        ...state,
        loading: { ...state.loading, [action.payload.token]: false },
        error: { ...state.error, [action.payload.token]: action.payload.error },
      };
    case "CLEAR_TOKEN_DATA": {
      const newState = { ...state };
      delete newState.usageData[action.payload.token];
      delete newState.loading[action.payload.token];
      delete newState.error[action.payload.token];
      delete newState.lastFetch[action.payload.token];
      return newState;
    }
    case "CLEAR_ALL_DATA":
      return initialState;
    default:
      return state;
  }
};

// ============================================================
// 📦 拆分为两个独立的 Context
// ============================================================

// 1️⃣ UsageDataContext - 只包含数据（state）
interface UsageDataContextType {
  state: UsageState;
}

const UsageDataContext = createContext<UsageDataContextType | undefined>(undefined);

// 2️⃣ UsageActionsContext - 只包含操作方法（dispatch + actions）
interface UsageActionsContextType {
  dispatch: React.Dispatch<UsageAction>;
  getUsageData: (
    token: string,
    startDate?: number,
    endDate?: number,
    teamId?: number,
    forceRefresh?: boolean
  ) => Promise<void>;
  shouldRefresh: (token: string, maxAge?: number) => boolean;
}

const UsageActionsContext = createContext<UsageActionsContextType | undefined>(undefined);

// ============================================================
// 🎯 Provider 组件
// ============================================================

export const UsageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(usageReducer, initialState);

  // ✨ 使用 useCallback 确保方法引用稳定
  const shouldRefresh = useCallback((
    token: string,
    maxAge: number = 5 * 60 * 1000
  ): boolean => {
    const lastFetch = state.lastFetch[token];
    const hasData = !!state.usageData[token];
    const isLoading = state.loading[token];

    if (isLoading) return false;
    if (!hasData || !lastFetch) return true;
    return Date.now() - lastFetch > maxAge;
  }, [state.lastFetch, state.usageData, state.loading]);

  const getUsageData = useCallback(async (
    token: string,
    startDate?: number,
    endDate?: number,
    teamId: number = -1,
    forceRefresh: boolean = false
  ) => {
    if (!forceRefresh && !shouldRefresh(token)) {
      console.log("🔄 使用缓存的用量数据");
      return;
    }

    dispatch({ type: "SET_LOADING", payload: { token, loading: true } });

    try {
      const { UsageService } = await import("../services/usageService");
      const endTime = endDate || Date.now();
      const startTime = startDate || endTime - 30 * 24 * 60 * 60 * 1000;

      const result = await UsageService.getUsageForPeriod(
        token,
        startTime,
        endTime,
        teamId
      );

      if (result.success && result.data) {
        dispatch({
          type: "SET_USAGE_DATA",
          payload: { token, data: result.data },
        });
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: { token, error: result.message },
        });
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: {
          token,
          error: error instanceof Error ? error.message : "获取用量数据失败",
        },
      });
    }
  }, [shouldRefresh]);

  // ✨ 使用 useMemo 分离数据和操作，防止不必要的重新渲染
  const dataContextValue = useMemo(() => ({
    state,
  }), [state]);

  const actionsContextValue = useMemo(() => ({
    dispatch,
    getUsageData,
    shouldRefresh,
  }), [getUsageData, shouldRefresh]);

  return (
    <UsageDataContext.Provider value={dataContextValue}>
      <UsageActionsContext.Provider value={actionsContextValue}>
        {children}
      </UsageActionsContext.Provider>
    </UsageDataContext.Provider>
  );
};

// ============================================================
// 🎣 Hooks - 按需订阅
// ============================================================

/**
 * ✅ 使用场景：只需要读取数据的组件
 * 性能：只有 state 变化时才会重新渲染
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useUsageData = (): UsageState => {
  const context = useContext(UsageDataContext);
  if (!context) throw new Error("useUsageData must be used within a UsageProvider");
  return context.state;
};

/**
 * ✅ 使用场景：只需要操作方法的组件（如刷新按钮）
 * 性能：不会因为 state 变化而重新渲染
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useUsageActions = (): UsageActionsContextType => {
  const context = useContext(UsageActionsContext);
  if (!context) throw new Error("useUsageActions must be used within a UsageProvider");
  return context;
};

/**
 * ⚠️ 兼容性 Hook：同时需要数据和操作
 * 注意：会订阅 state 变化，导致重新渲染
 * 建议：尽量拆分为 useUsageData + useUsageActions
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useUsage = () => {
  const state = useUsageData();
  const actions = useUsageActions();
  return { state, ...actions };
};

/**
 * ✅ 按 token 获取特定用量数据（优化版）
 * 使用 useMemo 减少不必要的对象创建
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useUsageByToken = (token: string) => {
  const state = useUsageData();
  const { getUsageData, shouldRefresh } = useUsageActions();

  // ✨ 使用 useMemo 缓存返回值，减少重新渲染
  return useMemo(() => ({
    usageData: state.usageData[token] || null,
    loading: state.loading[token] || false,
    error: state.error[token] || null,
    lastFetch: state.lastFetch[token] || null,
    fetchUsageData: (
      startDate?: number,
      endDate?: number,
      teamId?: number,
      forceRefresh?: boolean
    ) => getUsageData(token, startDate, endDate, teamId, forceRefresh),
    shouldRefresh: (maxAge?: number) => shouldRefresh(token, maxAge),
  }), [
    state.usageData,
    state.loading,
    state.error,
    state.lastFetch,
    token,
    getUsageData,
    shouldRefresh,
  ]);
};

// ============================================================
// 📝 导出类型（用于组件中的类型标注）
// ============================================================
export type { UsageState, UsageAction, UsageActionsContextType };

