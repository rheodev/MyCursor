import { memo } from "react";
import { FormField, TextInput, Checkbox } from "./FormField";

interface EmailPasswordFieldsProps {
  password: string;
  onPasswordChange: (value: string) => void;
  showLoginWindow: boolean;
  onShowLoginWindowChange: (checked: boolean) => void;
}

/**
 * 邮箱密码输入字段组（优化版）
 * 使用 memo 避免父组件其他状态变化时的重新渲染
 */
export const EmailPasswordFields = memo(({ 
  password,
  onPasswordChange,
  showLoginWindow,
  onShowLoginWindowChange
}: EmailPasswordFieldsProps) => {
  return (
    <>
      <FormField label="密码" required>
        <TextInput
          type="password"
          value={password}
          onChange={onPasswordChange}
          placeholder="输入密码"
        />
      </FormField>

      <Checkbox
        id="showLoginWindow"
        checked={showLoginWindow}
        onChange={onShowLoginWindowChange}
        label="显示登录窗口（用于处理验证码）"
      />
    </>
  );
}, (prevProps, nextProps) => {
  // 自定义比较：只比较关键属性
  return (
    prevProps.password === nextProps.password &&
    prevProps.showLoginWindow === nextProps.showLoginWindow
  );
});

EmailPasswordFields.displayName = "EmailPasswordFields";

