import { Button, Card, Icon } from "@/components";

interface WindowsUserInfo {
  username: string;
  has_cursor: boolean;
}

interface IdentityMenuProps {
  loading: boolean;
  autoUpdateDisabled: boolean | null;
  isWindows: boolean;
  windowsUsers: WindowsUserInfo[];
  syncingUser: string | null;
  currentCustomPath: string | null;
  onLoadBackups: () => void;
  onShowResetConfirm: () => void;
  onShowCompleteResetConfirm: () => void;
  onToggleAutoUpdate: () => void;
  onDetectWindowsUsers: () => void;
  onSyncUser: (username: string) => void;
  onGetLogPath: () => void;
  onOpenLogDirectory: () => void;
  onOpenCustomPathConfig: () => void;
}

export function IdentityMenu({
  loading,
  autoUpdateDisabled,
  isWindows,
  windowsUsers,
  syncingUser,
  currentCustomPath,
  onLoadBackups,
  onShowResetConfirm,
  onShowCompleteResetConfirm,
  onToggleAutoUpdate,
  onDetectWindowsUsers,
  onSyncUser,
  onGetLogPath,
  onOpenLogDirectory,
  onOpenCustomPathConfig,
}: IdentityMenuProps) {
  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Icon name="settings" size={20} />
            主要操作
          </h2>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="info"
              onClick={onLoadBackups}
              loading={loading}
              className="h-20 flex-col"
              icon={<Icon name="download" size={20} />}
            >
              恢复备份
            </Button>

            <Button
              variant="primary"
              onClick={onShowResetConfirm}
              loading={loading}
              className="h-20 flex-col"
              icon={<Icon name="refresh" size={20} />}
            >
              重置 ID
            </Button>

            <Button
              variant="danger"
              onClick={onShowCompleteResetConfirm}
              loading={loading}
              className="h-20 flex-col"
              icon={<Icon name="trash" size={20} />}
            >
              完全重置
            </Button>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Icon name="refresh" size={18} />
            自动更新
          </h3>
        </Card.Header>
        <Card.Content>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Cursor 自动更新
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                {autoUpdateDisabled === null
                  ? "检测中..."
                  : autoUpdateDisabled
                    ? "已禁用 — Cursor 不会自动更新"
                    : "已启用 — Cursor 会自动下载并安装更新"}
              </p>
            </div>
            <Button
              variant={autoUpdateDisabled ? "primary" : "danger"}
              size="sm"
              onClick={onToggleAutoUpdate}
              icon={
                autoUpdateDisabled ? <Icon name="refresh" size={16} /> : <Icon name="lock" size={16} />
              }
            >
              {autoUpdateDisabled ? "恢复更新" : "禁用更新"}
            </Button>
          </div>
        </Card.Content>
      </Card>

      {isWindows && (
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Icon name="user" size={18} />
                同步到其他用户
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDetectWindowsUsers}
                icon={<Icon name="search" size={14} />}
              >
                检测用户
              </Button>
            </div>
          </Card.Header>
          {windowsUsers.length > 0 && (
            <Card.Content>
              <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
                将当前 Cursor 登录的账号和机器码同步到其他 Windows 用户的 Cursor 中。同步前会自动关闭所有 Cursor 进程。
              </p>
              <div className="space-y-2">
                {windowsUsers.map((user) => (
                  <div
                    key={user.username}
                    className="flex items-center justify-between p-3 rounded"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderRadius: "var(--border-radius)",
                    }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {user.username}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "#10b981" }}>
                        已安装 Cursor
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={syncingUser === user.username}
                      onClick={() => onSyncUser(user.username)}
                      icon={<Icon name="arrows-exchange" size={14} />}
                    >
                      同步
                    </Button>
                  </div>
                ))}
              </div>
            </Card.Content>
          )}
        </Card>
      )}

      <Card>
        <Card.Header>
          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Icon name="settings" size={18} />
            日志管理
          </h3>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="ghost"
              onClick={onGetLogPath}
              className="h-16"
              icon={<Icon name="settings" size={18} />}
            >
              获取日志路径
            </Button>

            <Button
              variant="ghost"
              onClick={onOpenLogDirectory}
              className="h-16"
              icon="📂"
            >
              打开日志目录
            </Button>
          </div>
        </Card.Content>
      </Card>

      {isWindows && (
        <Card>
          <Card.Header>
            <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Icon name="settings" size={18} />
              路径配置
            </h3>
          </Card.Header>
          <Card.Content>
            <Button
              variant="ghost"
              onClick={onOpenCustomPathConfig}
              className="w-full h-16"
              icon={<Icon name="settings" size={18} />}
            >
              自定义Cursor路径
            </Button>
            {currentCustomPath && (
              <div
                className="p-3 mt-3 text-xs"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--border-radius)",
                }}
              >
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  当前自定义路径:
                </span>
                <br />
                <span style={{ color: "var(--text-secondary)" }}>{currentCustomPath}</span>
              </div>
            )}
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
