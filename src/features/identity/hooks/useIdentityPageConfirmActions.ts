import { useCallback } from "react";
import type { BackupInfo } from "@/types/auth";
import type { IdentityPageActionsContext } from "./identityPageActionTypes.ts";

interface UseIdentityPageConfirmActionsParams extends IdentityPageActionsContext {
  loadBackups: () => Promise<void>;
  handleReset: () => Promise<void>;
  handleCompleteReset: () => Promise<void>;
  handleSyncAccountToUser: (username: string) => Promise<void>;
}

export function useIdentityPageConfirmActions({
  showConfirm,
  showError,
  showSuccess,
  loadBackups,
  handleReset,
  handleCompleteReset,
  handleSyncAccountToUser,
}: UseIdentityPageConfirmActionsParams) {
  const handleDeleteBackup = useCallback((backup: BackupInfo, event?: React.MouseEvent) => {
    event?.stopPropagation();

    showConfirm({
      title: "删除备份",
      message: `确定要删除备份 "${backup.date_formatted}" 吗？此操作无法撤销。`,
      confirmText: "删除",
      cancelText: "取消",
      type: "danger",
      onConfirm: async () => {
        try {
          const { CursorService } = await import("@/services/cursorService");
          const result = await CursorService.deleteBackup(backup.path);
          if (result.success) {
            await loadBackups();
            showSuccess("备份删除成功");
          } else {
            showError(`删除失败: ${result.message}`);
          }
        } catch {
          showError("删除备份时发生错误");
        }
      },
    });
  }, [loadBackups, showConfirm, showError, showSuccess]);

  const showResetConfirm = useCallback(() => {
    showConfirm({
      title: "确认重置 Machine ID",
      message:
        "此操作将重置所有 Machine ID 为新的随机值。这可能会影响 Cursor 的授权状态。\n\n注意：重置后您可能需要重新登录 Cursor 账户。",
      confirmText: "确认重置",
      cancelText: "取消",
      type: "warning",
      onConfirm: handleReset,
    });
  }, [handleReset, showConfirm]);

  const showCompleteResetConfirm = useCallback(() => {
    showConfirm({
      title: "确认完全重置",
      message:
        "此操作将完全清除 Cursor 的所有配置和数据，包括 Machine ID，以及注入脚本等。\n\n危险操作：这将删除所有 Cursor 相关数据，无法撤销！\n- 所有用户设置将被清除\n- 已安装的扩展将被移除\n- 需要重新配置 Cursor\n- 需要重新登录账户",
      confirmText: "确认完全重置",
      cancelText: "取消",
      type: "danger",
      onConfirm: handleCompleteReset,
    });
  }, [handleCompleteReset, showConfirm]);

  const showSyncUserConfirm = useCallback((username: string) => {
    showConfirm({
      title: "确认同步到其他用户",
      message: `确定要将当前账号同步到用户“${username}”的 Cursor 中吗？\n\n此操作会关闭所有 Cursor 进程。`,
      confirmText: "确认同步",
      cancelText: "取消",
      type: "warning",
      onConfirm: () => {
        void handleSyncAccountToUser(username);
      },
    });
  }, [handleSyncAccountToUser, showConfirm]);

  return {
    handleDeleteBackup,
    showResetConfirm,
    showCompleteResetConfirm,
    showSyncUserConfirm,
  };
}
