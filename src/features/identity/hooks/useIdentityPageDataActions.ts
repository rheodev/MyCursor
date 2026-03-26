import { useCallback } from "react";
import { CursorService } from "@/services/cursorService";
import type { BackupInfo } from "@/types/auth";
import type { IdentityPageActionsContext, WindowsUserInfo } from "./identityPageActionTypes.ts";

export function useIdentityPageDataActions({
  customCursorPath,
  autoUpdateDisabled,
  selectedBackup,
  setCurrentStep,
  setLoading,
  setBackups,
  setSelectedBackup,
  setSelectedIds,
  setRestoreResult,
  setResetResult,
  setCurrentMachineIds,
  setMachineIdFileContent,
  setCurrentCustomPath,
  setCustomCursorPath,
  setAutoUpdateDisabled,
  setWindowsUsers,
  setSyncingUser,
  showSuccess,
  showError,
}: IdentityPageActionsContext) {
  const loadAutoUpdateStatus = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ disabled: boolean }>("get_auto_update_status");
      setAutoUpdateDisabled(result.disabled);
    } catch {
      // ignore
    }
  }, [setAutoUpdateDisabled]);

  const loadCustomCursorPath = useCallback(async () => {
    try {
      const path = await CursorService.getCustomCursorPath();
      setCurrentCustomPath(path);
      setCustomCursorPath(path || "");
    } catch {
      // ignore
    }
  }, [setCurrentCustomPath, setCustomCursorPath]);

  const loadCurrentMachineIds = useCallback(async () => {
    try {
      setLoading(true);
      const [ids, content] = await Promise.all([
        CursorService.getCurrentMachineIds(),
        CursorService.getMachineIdFileContent(),
      ]);
      setCurrentMachineIds(ids);
      setMachineIdFileContent(content);
    } catch {
      showError("加载 Machine ID 失败");
    } finally {
      setLoading(false);
    }
  }, [setCurrentMachineIds, setLoading, setMachineIdFileContent, showError]);

  const handleDetectWindowsUsers = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ success: boolean; users: WindowsUserInfo[] }>("list_windows_users");
      if (result.success) {
        const availableUsers = result.users.filter((user) => user.has_cursor);
        setWindowsUsers(availableUsers);
        if (result.users.length === 0) {
          showSuccess("未检测到其他 Windows 用户");
        } else if (availableUsers.length === 0) {
          showSuccess("已检测到其他 Windows 用户，但没有发现可用的 Cursor 数据目录");
        }
      }
    } catch (error) {
      showError(`检测用户失败: ${error}`);
    }
  }, [setWindowsUsers, showError, showSuccess]);

  const handleSyncAccountToUser = useCallback(
    async (username: string) => {
      setSyncingUser(username);
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const result = await invoke<{ success: boolean; message: string }>("sync_account_to_user", {
          targetUsername: username,
        });

        if (result.success) {
          showSuccess(result.message);
        } else {
          showError(result.message);
        }
      } catch (error) {
        showError(`同步失败: ${error}`);
      } finally {
        setSyncingUser(null);
      }
    },
    [setSyncingUser, showError, showSuccess]
  );

  const loadBackups = useCallback(async () => {
    try {
      setLoading(true);
      const backupList = await CursorService.getBackups();
      setBackups(backupList);
      setCurrentStep("select");
    } catch {
      showError("加载备份列表失败");
    } finally {
      setLoading(false);
    }
  }, [setBackups, setCurrentStep, setLoading, showError]);

  const handleBackupSelect = useCallback(async (backup: BackupInfo) => {
    try {
      setLoading(true);
      setSelectedBackup(backup);
      const ids = await CursorService.extractBackupIds(backup.path);
      setSelectedIds(ids);
      setCurrentStep("preview");
    } catch {
      showError("无法从备份中提取机器ID信息");
    } finally {
      setLoading(false);
    }
  }, [setCurrentStep, setLoading, setSelectedBackup, setSelectedIds, showError]);

  const handleRestore = useCallback(async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      setCurrentStep("confirm");
      const result = await CursorService.restoreMachineIds(selectedBackup.path);
      setRestoreResult(result);
      setCurrentStep("result");

      if (result.success) {
        await loadCurrentMachineIds();
        showSuccess("恢复成功！");
      } else {
        showError(result.message);
      }
    } catch {
      showError("恢复操作失败");
    } finally {
      setLoading(false);
    }
  }, [loadCurrentMachineIds, selectedBackup, setCurrentStep, setLoading, setRestoreResult, showError, showSuccess]);

  const handleReset = useCallback(async () => {
    try {
      setLoading(true);
      const result = await CursorService.resetMachineIds();
      setResetResult(result);
      setCurrentStep("reset");

      if (result.success) {
        await loadCurrentMachineIds();
        showSuccess("重置成功！");
      } else {
        showError(result.message);
      }
    } catch {
      showError("重置操作失败");
    } finally {
      setLoading(false);
    }
  }, [loadCurrentMachineIds, setCurrentStep, setLoading, setResetResult, showError, showSuccess]);

  const handleCompleteReset = useCallback(async () => {
    try {
      setLoading(true);
      const result = await CursorService.completeResetMachineIds();
      setResetResult(result);
      setCurrentStep("complete_reset");

      if (result.success) {
        await loadCurrentMachineIds();
        showSuccess("完全重置成功！");
      } else {
        showError(result.message);
      }
    } catch {
      showError("完全重置操作失败");
    } finally {
      setLoading(false);
    }
  }, [loadCurrentMachineIds, setCurrentStep, setLoading, setResetResult, showError, showSuccess]);

  const handleOpenLogDirectory = useCallback(async () => {
    try {
      const result = await CursorService.openLogDirectory();
      showSuccess(result);
    } catch (error) {
      showError(`打开日志目录失败: ${error}`);
    }
  }, [showError, showSuccess]);

  const handleGetLogPath = useCallback(async () => {
    try {
      const logPath = await CursorService.getLogFilePath();
      showSuccess(`日志文件路径: ${logPath}`);
    } catch (error) {
      showError(`获取日志路径失败: ${error}`);
    }
  }, [showError, showSuccess]);

  const handleSetCustomPath = useCallback(async () => {
    if (!customCursorPath.trim()) {
      showError("请输入Cursor路径");
      return;
    }

    try {
      await CursorService.setCustomCursorPath(customCursorPath.trim());
      await loadCustomCursorPath();
      showSuccess("自定义Cursor路径设置成功");
    } catch (error) {
      showError(`设置自定义路径失败: ${error}`);
    }
  }, [customCursorPath, loadCustomCursorPath, showError, showSuccess]);

  const handleClearCustomPath = useCallback(async () => {
    try {
      const result = await CursorService.clearCustomCursorPath();
      await loadCustomCursorPath();
      showSuccess(result);
    } catch (error) {
      showError(`清除自定义路径失败: ${error}`);
    }
  }, [loadCustomCursorPath, showError, showSuccess]);

  const handleFillDetectedPath = useCallback(async () => {
    try {
      const debugInfo = await CursorService.debugWindowsCursorPaths();

      for (const info of debugInfo) {
        if (info.includes("- package.json: true") && info.includes("- main.js: true")) {
          const pathMatch = info.match(/路径\d+: (.+)/);
          if (pathMatch) {
            const detectedPath = pathMatch[1].trim();
            setCustomCursorPath(detectedPath);
            showSuccess(`已填充检测到的路径: ${detectedPath}`);
            return;
          }
        }
      }

      showError("未检测到有效的Cursor安装路径");
    } catch (error) {
      showError(`自动填充路径失败: ${error}`);
    }
  }, [setCustomCursorPath, showError, showSuccess]);

  const handleBrowsePath = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择 Cursor 的 resources/app 目录",
        defaultPath: customCursorPath || undefined,
      });

      if (selected && typeof selected === "string") {
        setCustomCursorPath(selected);
        showSuccess(`已选择路径: ${selected}`);
      }
    } catch (error) {
      showError(`选择路径失败: ${error}`);
    }
  }, [customCursorPath, setCustomCursorPath, showError, showSuccess]);

  const handleToggleAutoUpdate = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const cmd = autoUpdateDisabled ? "enable_auto_update" : "disable_auto_update";
      const result = await invoke<{ success: boolean; message: string }>(cmd);
      if (result.success) {
        showSuccess(result.message);
        await loadAutoUpdateStatus();
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError(`操作失败: ${error}`);
    }
  }, [autoUpdateDisabled, loadAutoUpdateStatus, showError, showSuccess]);

  return {
    loadAutoUpdateStatus,
    loadCustomCursorPath,
    loadCurrentMachineIds,
    loadBackups,
    handleBackupSelect,
    handleRestore,
    handleReset,
    handleCompleteReset,
    handleOpenLogDirectory,
    handleGetLogPath,
    handleSetCustomPath,
    handleClearCustomPath,
    handleFillDetectedPath,
    handleBrowsePath,
    handleToggleAutoUpdate,
    handleDetectWindowsUsers,
    handleSyncAccountToUser,
  };
}
