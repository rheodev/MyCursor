import { memo } from "react";
import { FormField, TextareaInput } from "./FormField";

interface TokenInputFieldsProps {
  token: string;
  onTokenChange: (value: string) => void;
  refreshToken: string;
  onRefreshTokenChange: (value: string) => void;
  workosToken: string;
  onWorkosTokenChange: (value: string) => void;
  onFetchAccessToken: () => void;
  fetchingAccessToken: boolean;
}

/**
 * Token 输入字段组（优化版）
 * 使用 memo 避免父组件其他状态变化时的重新渲染
 */
export const TokenInputFields = memo(({ 
  token,
  onTokenChange,
  refreshToken,
  onRefreshTokenChange,
  workosToken,
  onWorkosTokenChange,
  onFetchAccessToken,
  fetchingAccessToken
}: TokenInputFieldsProps) => {
  return (
    <>
      {/* Access Token */}
      <FormField label="Access Token" required>
        <TextareaInput
          value={token}
          onChange={onTokenChange}
          placeholder="粘贴 Access Token"
          rows={3}
        />
      </FormField>

      {/* Refresh Token */}
      <FormField label="Refresh Token" description="用于自动刷新 Access Token（可选）">
        <TextareaInput
          value={refreshToken}
          onChange={onRefreshTokenChange}
          placeholder="粘贴 Refresh Token (可选)"
          rows={3}
        />
      </FormField>

      {/* WorkOS Session Token */}
      <FormField 
        label="WorkOS Session Token" 
        description="可用于获取 Access Token 和取消订阅等高级功能"
      >
        <div className="flex gap-2">
          <TextareaInput
            value={workosToken}
            onChange={onWorkosTokenChange}
            placeholder="粘贴 WorkOS Session Token (可选)"
            rows={3}
          />
          <button
            onClick={onFetchAccessToken}
            disabled={fetchingAccessToken || !workosToken.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed h-fit whitespace-nowrap"
          >
            {fetchingAccessToken ? "获取中..." : "获取 Token"}
          </button>
        </div>
      </FormField>
    </>
  );
}, (prevProps, nextProps) => {
  // 自定义比较：只比较关键属性
  return (
    prevProps.token === nextProps.token &&
    prevProps.refreshToken === nextProps.refreshToken &&
    prevProps.workosToken === nextProps.workosToken &&
    prevProps.fetchingAccessToken === nextProps.fetchingAccessToken
  );
});

TokenInputFields.displayName = "TokenInputFields";

