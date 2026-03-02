import { memo } from "react";

type AccountType = "token" | "email" | "verification_code";

interface AccountTypeSelectorProps {
  value: AccountType;
  onChange: (type: AccountType) => void;
}

interface TypeOption {
  value: AccountType;
  label: string;
  icon: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "token", label: "Token", icon: "🔑" },
  { value: "email", label: "邮箱密码", icon: "📧" },
  { value: "verification_code", label: "验证码登录", icon: "🔐" },
];

/**
 * 账户类型选择器
 * 使用 memo 优化，只有 value 变化时才重新渲染
 */
export const AccountTypeSelector = memo(({ 
  value, 
  onChange 
}: AccountTypeSelectorProps) => {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-700">
        添加方式
      </label>
      <div className="flex gap-2">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              value === option.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {option.icon} {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较：只有 value 变化时才重新渲染
  return prevProps.value === nextProps.value;
});

AccountTypeSelector.displayName = "AccountTypeSelector";

