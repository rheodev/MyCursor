import { useCallback } from "react";
import {
  Card,
  Button,
  useToast,
  ToastManager,
  Icon,
} from "../components";
import { invoke } from "@tauri-apps/api/core";

const SettingsPage = () => {
  const { toasts, removeToast, showSuccess, showError } = useToast();

  const handleClearUsageData = useCallback(async () => {
    try {
      const result = await invoke<{ success: boolean; message: string }>("clear_usage_data");
      if (result.success) {
        showSuccess("用量数据已清除");
      } else {
        showError(result.message);
      }
    } catch (_error) {
      showError("清除数据失败");
    }
  }, [showSuccess, showError]);

  const handleClearAccountCache = useCallback(async () => {
    try {
      const result = await invoke<{ success: boolean; message: string }>("clear_account_cache");
      if (result.success) {
        showSuccess("账户缓存已清除");
      } else {
        showError(result.message);
      }
    } catch (_error) {
      showError("清除缓存失败");
    }
  }, [showSuccess, showError]);

  const handleClearEventsData = useCallback(async () => {
    try {
      const result = await invoke<{ success: boolean; message: string }>("clear_events_data");
      if (result.success) {
        showSuccess("事件数据已清除");
      } else {
        showError(result.message);
      }
    } catch (_error) {
      showError("清除数据失败");
    }
  }, [showSuccess, showError]);

  return (
    <div className="space-y-6">
      <ToastManager toasts={toasts} removeToast={removeToast} />

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <Icon name="settings" size={28} />
          应用设置
        </h2>

        {/* 数据管理 */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Icon name="trash" size={20} />
              数据管理
            </h3>
            <div className="space-y-4">
              <div>
                <Button
                  variant="danger"
                  onClick={handleClearUsageData}
                  icon={<Icon name="trash" size={16} />}
                >
                  清除所有用量数据
                </Button>
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                  <Icon name="alert" size={14} color="#ef4444" />
                  此操作将删除本地保存的所有用量数据，但不影响账户信息
                </p>
              </div>

              <div>
                <Button
                  variant="danger"
                  onClick={handleClearAccountCache}
                  icon={<Icon name="trash" size={16} />}
                >
                  清除所有账户缓存
                </Button>
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                  <Icon name="alert" size={14} color="#ef4444" />
                  此操作将删除本地保存的所有账户订阅信息缓存
                </p>
              </div>

              <div>
                <Button
                  variant="danger"
                  onClick={handleClearEventsData}
                  icon={<Icon name="trash" size={16} />}
                >
                  清除所有事件数据
                </Button>
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                  <Icon name="alert" size={14} color="#ef4444" />
                  此操作将删除本地保存的所有事件明细数据
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 数据说明 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Icon name="info" size={20} />
          数据说明
        </h3>
        <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <p><strong>本地存储:</strong> 所有数据保存在程序同级 cursor_data 目录中</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <p><strong>自动保存:</strong> 用量数据和日期选择会自动保存到本地</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <p><strong>离线访问:</strong> 无需联网即可查看已保存的用量数据</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <p><strong>手动刷新:</strong> 只有点击"刷新"按钮时才会获取最新数据</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
