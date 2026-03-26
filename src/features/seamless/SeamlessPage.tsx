import { useState, useEffect, useCallback } from "react";
import { SeamlessService } from "@/services/seamlessService";
import {
  Button,
  Card,
  Input,
  useToast,
  ToastManager,
  useConfirmDialog,
  Icon,
} from "@/components";
import type { SeamlessStatus, SeamlessResult } from "@/types/account";

const DEFAULT_PORT = 36529;

const SeamlessPage = () => {
  const [status, setStatus] = useState<SeamlessStatus | null>(null);
  const [port, setPort] = useState<number>(DEFAULT_PORT);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SeamlessResult | null>(null);

  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  const loadStatus = useCallback(async () => {
    try {
      const s = await SeamlessService.getStatus();
      setStatus(s);
      if (s.port) setPort(s.port);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const doInject = async () => {
    try {
      setActionLoading("inject");
      const result = await SeamlessService.inject(port);
      setLastResult(result);
      if (result.success) showSuccess(result.message);
      else showError(result.message);
      await loadStatus();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "注入失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleInject = () => {
    showConfirm({
      title: "注入无感换号",
      message:
        "将修改 Cursor 的 workbench.desktop.main.js 文件，启用无感换号。原始文件会自动备份。\n\n请确保 Cursor 已完全关闭。\n使用期间需保持 MyCursor 运行并启动 HTTP 服务器。",
      confirmText: "注入",
      cancelText: "取消",
      type: "warning",
      onConfirm: doInject,
    });
  };

  const doRestore = async () => {
    try {
      setActionLoading("restore");
      const result = await SeamlessService.restore();
      setLastResult(result);
      if (result.success) showSuccess(result.message);
      else showWarning(result.message);
      await loadStatus();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "恢复失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = () => {
    showConfirm({
      title: "恢复原始文件",
      message: "将恢复 Cursor 的 workbench.desktop.main.js，移除无感换号。\n\n恢复后请重启 Cursor。",
      confirmText: "恢复",
      cancelText: "取消",
      type: "danger",
      onConfirm: doRestore,
    });
  };

  const handleStartServer = async () => {
    try {
      setActionLoading("start");
      await SeamlessService.startServer(port);
      showSuccess("HTTP 服务器已启动");
      await loadStatus();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "启动失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopServer = async () => {
    try {
      setActionLoading("stop");
      await SeamlessService.stopServer();
      showSuccess("HTTP 服务器已停止");
      await loadStatus();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "停止失败");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ToastManager toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
          <Icon name="bolt" size={28} />
          无感换号
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          注入插件到 Cursor，在界面右下角添加 ⚡ 换号按钮，点击即可弹出账号选择（支持按类型/标签筛选），选择后无感切换。
        </p>
      </div>

      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Icon name="info" size={20} />
            当前状态
          </h2>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusBadge label="注入状态" active={status?.injected ?? false} activeText="已注入" inactiveText="未注入" />
            <StatusBadge label="HTTP 服务器" active={status?.server_running ?? false} activeText={`运行中 (:${status?.port ?? port})`} inactiveText="已停止" />
            <StatusBadge label="原始备份" active={status?.backup_exists ?? false} activeText="已备份" inactiveText="无" />
            <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--bg-secondary)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>端口</p>
              <p className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{port}</p>
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Icon name="plug" size={20} />
            注入管理
          </h2>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                服务端口:
              </label>
              <Input
                type="number"
                value={port.toString()}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0 && v < 65536) setPort(v);
                }}
                className="w-32"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="primary"
                onClick={handleInject}
                loading={actionLoading === "inject"}
                disabled={!!actionLoading}
                className="h-16 flex-col"
                icon={<Icon name="bolt" size={20} />}
              >
                {status?.injected ? "重新注入" : "注入无感换号"}
              </Button>
              <Button
                variant="danger"
                onClick={handleRestore}
                loading={actionLoading === "restore"}
                disabled={!!actionLoading || !status?.backup_exists}
                className="h-16 flex-col"
                icon={<Icon name="refresh" size={20} />}
              >
                恢复原始文件
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Icon name="settings" size={20} />
            HTTP 服务器
          </h2>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              使用 Cursor 期间需保持服务器运行，为注入的代码提供账号数据。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="info"
                onClick={handleStartServer}
                loading={actionLoading === "start"}
                disabled={!!actionLoading || (status?.server_running ?? false)}
                className="h-14"
                icon={<Icon name="login" size={20} />}
              >
                启动服务器
              </Button>
              <Button
                variant="danger"
                onClick={handleStopServer}
                loading={actionLoading === "stop"}
                disabled={!!actionLoading || !(status?.server_running ?? false)}
                className="h-14"
                icon={<Icon name="logout" size={20} />}
              >
                停止服务器
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {lastResult && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Icon name="info" size={20} />
              操作结果
            </h2>
          </Card.Header>
          <Card.Content>
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: lastResult.success ? "rgba(78, 201, 176, 0.1)" : "rgba(244, 135, 113, 0.1)",
                border: `1px solid ${lastResult.success ? "rgba(78, 201, 176, 0.3)" : "rgba(244, 135, 113, 0.3)"}`,
              }}
            >
              <p className="font-medium text-sm mb-2" style={{ color: lastResult.success ? "#4ec9b0" : "#f48771" }}>
                {lastResult.success ? "成功" : "失败"}：{lastResult.message}
              </p>
              {lastResult.details && lastResult.details.length > 0 && (
                <ul className="space-y-1">
                  {lastResult.details.map((d, i) => (
                    <li key={i} className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card.Content>
        </Card>
      )}

      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Icon name="info" size={20} />
            使用说明
          </h2>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3">
            {[
              "注入前请先完全关闭 Cursor。",
              "设置端口，点击「注入无感换号」。",
              "点击「启动服务器」开启 HTTP 账号服务。",
              "打开 Cursor 正常使用。",
              "需要换号时，点击右下角 ⚡ 按钮，弹出账号选择（可按类型/标签筛选）。",
              "选择账号后无感切换，重新发送即可。",
              "使用期间保持 MyCursor 在后台运行。",
              "Cursor 更新后需重新注入。",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: "var(--primary-color)", color: "white" }}
                >
                  {i + 1}
                </span>
                <p className="text-sm pt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

function StatusBadge({
  label,
  active,
  activeText,
  inactiveText,
}: {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: active ? "#4ec9b0" : "#666" }}
        />
        <p className="text-sm font-semibold" style={{ color: active ? "#4ec9b0" : "var(--text-secondary)" }}>
          {active ? activeText : inactiveText}
        </p>
      </div>
    </div>
  );
}

export default SeamlessPage;
