import { useState, useEffect, useRef, memo, useCallback } from "react";
import { AccountService } from "../services/accountService";
import { invoke } from "@tauri-apps/api/core";
import { base64URLEncode, K, sha256 } from "../utils/cursorToken";
import { AccountTypeSelector } from "./form/AccountTypeSelector";
import { FormField, TextInput, TextareaInput } from "./form/FormField";
import { TokenInputFields } from "./form/TokenInputFields";
import { EmailPasswordFields } from "./form/EmailPasswordFields";
import { TagSelector } from "./TagSelector";
import Modal from "./Modal";

type AccountType = "token" | "email" | "verification_code";

interface AddAccountFormProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  onToast: (message: string, type: "success" | "error") => void;
}

export const AddAccountForm = memo(({ isOpen, onSuccess, onCancel, onToast }: AddAccountFormProps) => {
  const [addAccountType, setAddAccountType] = useState<AccountType>("token");
  const [newEmail, setNewEmail] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRefreshToken, setNewRefreshToken] = useState("");
  const [newWorkosSessionToken, setNewWorkosSessionToken] = useState("");
  const [autoLoginLoading, setAutoLoginLoading] = useState(false);
  const [showLoginWindow, setShowLoginWindow] = useState(false);
  const [fetchingAccessToken, setFetchingAccessToken] = useState(false);
  const [showCancelLoginButton, setShowCancelLoginButton] = useState(false);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [showMachineIds, setShowMachineIds] = useState(false);
  const [machineIdsJson, setMachineIdsJson] = useState("");
  const [machineIdsParseError, setMachineIdsParseError] = useState("");
  const [parsedMachineIds, setParsedMachineIds] = useState<Record<string, string>>({});

  const currentEmailRef = useRef<string>("");
  const autoLoginTimerRef = useRef<number | null>(null);

  // 每次打开弹窗时重置为全新表单
  useEffect(() => {
    if (isOpen) {
      setAddAccountType("token");
      setNewEmail("");
      setNewToken("");
      setNewPassword("");
      setNewRefreshToken("");
      setNewWorkosSessionToken("");
      setAutoLoginLoading(false);
      setShowLoginWindow(false);
      setFetchingAccessToken(false);
      setShowCancelLoginButton(false);
      setNewTags([]);
      setShowMachineIds(false);
      setMachineIdsJson("");
      setMachineIdsParseError("");
      setParsedMachineIds({});
    }
  }, [isOpen]);

  // ============================================================
  // 🎯 业务逻辑（使用 useCallback 优化）
  // ============================================================

  // 根据webToken获取客户端accessToken
  const getClientAccessToken = useCallback(async (workos_cursor_session_token: string) => {
    try {
      const verifier = base64URLEncode(K);
      const challenge = base64URLEncode(new Uint8Array(await sha256(verifier)));
      const uuid = crypto.randomUUID();

      await invoke("trigger_authorization_login", {
        uuid,
        challenge,
        workosCursorSessionToken: workos_cursor_session_token,
      });

      return new Promise((resolve) => {
        const interval = setInterval(() => {
          invoke("trigger_authorization_login_poll", { uuid, verifier })
            .then((res: any) => {
              if (res.success) {
                const data = JSON.parse(res.response_body);
                resolve(data);
                clearInterval(interval);
              }
            })
            .catch((error) => {
              console.error("轮询获取token失败:", error);
            });
        }, 1000);

        setTimeout(() => {
          clearInterval(interval);
          resolve(null);
        }, 20000);
      });
    } catch (error) {
      console.error("获取客户端 AccessToken 失败:", error);
      return null;
    }
  }, []);

  // 获取 AccessToken 并通过 /api/auth/me 自动填充邮箱
  const handleFetchAccessToken = useCallback(async () => {
    if (!newWorkosSessionToken.trim()) {
      onToast("请先输入 WorkOS Session Token", "error");
      return;
    }

    setFetchingAccessToken(true);
    try {
      const result: any = await getClientAccessToken(newWorkosSessionToken.trim());
      if (!result?.accessToken) {
        onToast("获取 AccessToken 失败，请检查 WorkOS Session Token 是否正确", "error");
        return;
      }

      setNewToken(result.accessToken);
      if (result.refreshToken) setNewRefreshToken(result.refreshToken);

      // 调用 /api/auth/me 获取用户信息，始终填充邮箱
      try {
        const meResult = await AccountService.getAuthMe(newWorkosSessionToken.trim());
        if (meResult.success && meResult.data?.email) {
          setNewEmail(meResult.data.email);
          onToast(`获取成功！用户: ${meResult.data.name || meResult.data.email}`, "success");
        } else {
          onToast("AccessToken 获取成功！", "success");
        }
      } catch {
        onToast("AccessToken 获取成功！", "success");
      }
    } catch (error) {
      console.error("获取 AccessToken 失败:", error);
      onToast("获取 AccessToken 时发生错误", "error");
    } finally {
      setFetchingAccessToken(false);
    }
  }, [newWorkosSessionToken, getClientAccessToken, onToast]);

  const handleAutoLogin = useCallback(async () => {
    if (!newEmail || !newPassword) {
      onToast("请填写邮箱和密码", "error");
      return;
    }

    try {
      setAutoLoginLoading(true);
      setShowCancelLoginButton(false);
      onToast("正在后台执行自动登录，请稍候...", "success");

      if (autoLoginTimerRef.current) {
        window.clearTimeout(autoLoginTimerRef.current);
      }

      autoLoginTimerRef.current = window.setTimeout(() => {
        setShowCancelLoginButton(true);
        onToast("自动登录超时（30秒），如需要可以点击取消登录", "error");
      }, 30000);

      currentEmailRef.current = newEmail;

      await invoke("auto_login_and_get_cookie", {
        email: newEmail,
        password: newPassword,
        showWindow: showLoginWindow,
      });
    } catch (error) {
      console.error("启动自动登录失败:", error);
      if (autoLoginTimerRef.current) {
        window.clearTimeout(autoLoginTimerRef.current);
      }
      setAutoLoginLoading(false);
      setShowCancelLoginButton(false);
      onToast("启动自动登录失败", "error");
    }
  }, [newEmail, newPassword, showLoginWindow, onToast]);

  const handleVerificationCodeLogin = useCallback(async () => {
    if (!newEmail) {
      onToast("请填写邮箱", "error");
      return;
    }

    try {
      setAutoLoginLoading(true);
      setShowCancelLoginButton(false);
      onToast("正在打开登录窗口，请在窗口中输入邮箱收到的验证码...", "success");

      if (autoLoginTimerRef.current) {
        window.clearTimeout(autoLoginTimerRef.current);
      }

      autoLoginTimerRef.current = window.setTimeout(() => {
        setShowCancelLoginButton(true);
        onToast("验证码登录超时（60秒），如需要可以点击取消登录", "error");
      }, 60000);

      currentEmailRef.current = newEmail;

      await invoke("verification_code_login", {
        email: newEmail,
      });
    } catch (error) {
      console.error("启动验证码登录失败:", error);
      if (autoLoginTimerRef.current) {
        window.clearTimeout(autoLoginTimerRef.current);
      }
      setAutoLoginLoading(false);
      setShowCancelLoginButton(false);
      onToast("启动验证码登录失败", "error");
    }
  }, [newEmail, onToast]);

  const handleCancelLogin = useCallback(async () => {
    try {
      await invoke("auto_login_failed", { error: "用户取消" });
      if (autoLoginTimerRef.current) {
        window.clearTimeout(autoLoginTimerRef.current);
      }
      setAutoLoginLoading(false);
      setShowCancelLoginButton(false);
      onToast("已取消登录", "success");
    } catch (error) {
      console.error("取消登录失败:", error);
      onToast("取消登录失败", "error");
    }
  }, [onToast]);

  const REQUIRED_MACHINE_ID_KEYS = [
    "telemetry.devDeviceId", "telemetry.macMachineId",
    "telemetry.machineId", "telemetry.sqmId", "storage.serviceMachineId",
  ] as const;

  const OPTIONAL_MACHINE_ID_KEYS = [
    "system.machineGuid", "system.sqmClientId",
  ] as const;

  const parseMachineIdsFromJson = useCallback((json: string) => {
    if (!json.trim()) {
      setParsedMachineIds({});
      setMachineIdsParseError("");
      return;
    }
    try {
      const data = JSON.parse(json);
      const ids: Record<string, string> = {};
      const missing: string[] = [];
      for (const key of REQUIRED_MACHINE_ID_KEYS) {
        if (data[key] && typeof data[key] === "string") {
          ids[key] = data[key];
        } else {
          missing.push(key.split(".").pop() || key);
        }
      }
      for (const key of OPTIONAL_MACHINE_ID_KEYS) {
        if (data[key] && typeof data[key] === "string") {
          ids[key] = data[key];
        }
      }
      if (missing.length > 0) {
        setMachineIdsParseError(`缺少必须字段: ${missing.join(", ")}`);
        setParsedMachineIds({});
      } else {
        setParsedMachineIds(ids);
        setMachineIdsParseError("");
      }
    } catch {
      setMachineIdsParseError("JSON 格式错误，请粘贴完整的 storage.json 内容");
      setParsedMachineIds({});
    }
  }, []);

  const handleAddAccount = useCallback(async () => {
    if (!newEmail) {
      onToast("请填写邮箱地址", "error");
      return;
    }

    if (!newEmail.includes("@")) {
      onToast("请输入有效的邮箱地址", "error");
      return;
    }

    if (addAccountType === "token") {
      if (!newToken) {
        onToast("请填写Token", "error");
        return;
      }
    } else if (addAccountType === "email") {
      if (!newPassword) {
        onToast("请填写密码", "error");
        return;
      }
      await handleAutoLogin();
      return;
    } else if (addAccountType === "verification_code") {
      await handleVerificationCodeLogin();
      return;
    }

    // 机器码验证：至少包含 5 个必须字段
    if (showMachineIds && machineIdsJson.trim()) {
      const hasAllRequired = REQUIRED_MACHINE_ID_KEYS.every((k) => parsedMachineIds[k]);
      if (machineIdsParseError || !hasAllRequired) {
        onToast("机器码绑定失败：请确保包含全部 5 个必须字段", "error");
        return;
      }
    }

    try {
      const result = await AccountService.addAccount(
        newEmail,
        newToken,
        newRefreshToken || undefined,
        newWorkosSessionToken || undefined,
        newTags.length > 0 ? newTags : undefined
      );
      
      if (result.success) {
        // 如果用户提供了机器码，追加更新
        if (showMachineIds && REQUIRED_MACHINE_ID_KEYS.every((k) => parsedMachineIds[k])) {
          await AccountService.editAccount(newEmail, undefined, undefined, undefined, undefined, undefined, undefined, parsedMachineIds);
        }
        onToast(result.message || "账户添加成功", "success");
        onSuccess(); // 关闭弹窗后 useEffect 会自动重置表单
      } else {
        onToast(result.message, "error");
      }
    } catch (error) {
      console.error("添加账户失败:", error);
      onToast("添加账户失败", "error");
    }
  }, [
    newEmail,
    newToken,
    newPassword,
    newRefreshToken,
    newWorkosSessionToken,
    newTags,
    addAccountType,
    onToast,
    onSuccess,
    handleAutoLogin,
    handleVerificationCodeLogin,
  ]);

  // ============================================================
  // 🎨 渲染
  // ============================================================

  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      title="添加新账户"
      size="lg"
      footer={
        <>
          {autoLoginLoading && showCancelLoginButton && (
            <button
              onClick={handleCancelLogin}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: 'var(--border-radius)',
                cursor: 'pointer',
                transition: 'all var(--transition-duration) ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
            >
              取消登录
            </button>
          )}
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              transition: 'all var(--transition-duration) ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
            }}
          >
            取消
          </button>
          <button
            onClick={handleAddAccount}
            disabled={autoLoginLoading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: autoLoginLoading ? 'var(--bg-secondary)' : 'var(--primary-color)',
              border: 'none',
              borderRadius: 'var(--border-radius)',
              cursor: autoLoginLoading ? 'not-allowed' : 'pointer',
              opacity: autoLoginLoading ? 0.5 : 1,
              transition: 'all var(--transition-duration) ease',
            }}
            onMouseEnter={(e) => {
              if (!autoLoginLoading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {autoLoginLoading ? "登录中..." : "添加账户"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 账户类型选择器（优化后的子组件） */}
        <AccountTypeSelector
          value={addAccountType}
          onChange={setAddAccountType}
        />

        {/* 邮箱输入（优化后的子组件） */}
        <FormField label="邮箱地址" required>
          <TextInput
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder="your.email@example.com"
          />
        </FormField>

        {/* 根据类型显示不同的输入框（优化后的子组件） */}
        {addAccountType === "email" && (
          <EmailPasswordFields
            password={newPassword}
            onPasswordChange={setNewPassword}
            showLoginWindow={showLoginWindow}
            onShowLoginWindowChange={setShowLoginWindow}
          />
        )}

        {addAccountType === "token" && (
          <TokenInputFields
            token={newToken}
            onTokenChange={setNewToken}
            refreshToken={newRefreshToken}
            onRefreshTokenChange={setNewRefreshToken}
            workosToken={newWorkosSessionToken}
            onWorkosTokenChange={setNewWorkosSessionToken}
            onFetchAccessToken={handleFetchAccessToken}
            fetchingAccessToken={fetchingAccessToken}
          />
        )}

        {/* 标签选择 */}
        <FormField label="标签" description="选择预设标签或输入新标签回车创建">
          <TagSelector
            selectedTags={newTags}
            onChange={setNewTags}
          />
        </FormField>

        {/* 机器码绑定（可选） */}
        {addAccountType === "token" && (
          <div>
            <button
              type="button"
              onClick={() => setShowMachineIds(!showMachineIds)}
              className="flex items-center gap-1 text-sm font-medium mb-2"
              style={{ color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ transform: showMachineIds ? 'rotate(90deg)' : 'rotate(0)', transition: '0.2s', display: 'inline-block' }}>&#9654;</span>
              绑定机器码（可选）
            </button>
            {showMachineIds && (
              <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  粘贴 storage.json 内容，自动提取 5 个必须字段。
                  如需绑定注册表 ID（machineGuid、sqmClientId），请手动添加到 JSON 中。
                  <br />路径：%APPDATA%\Cursor\User\globalStorage\storage.json
                </p>
                <TextareaInput
                  value={machineIdsJson}
                  onChange={(val) => {
                    setMachineIdsJson(val);
                    parseMachineIdsFromJson(val);
                  }}
                  placeholder='粘贴 storage.json 内容（JSON 格式）'
                  rows={4}
                />
                {machineIdsParseError && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{machineIdsParseError}</p>
                )}
                {!machineIdsParseError && Object.keys(parsedMachineIds).length >= 5 && (
                  <div className="mt-2 text-xs space-y-0.5" style={{ color: '#10b981' }}>
                    {Object.entries(parsedMachineIds).map(([k, v]) => (
                      <p key={k} className="font-mono truncate">{k.split('.').pop()}: {String(v).slice(0, 30)}...</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
});

AddAccountForm.displayName = "AddAccountForm";

