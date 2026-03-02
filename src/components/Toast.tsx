import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  message,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    success: {
      className: "bg-white",
      textColor: "#22c55e", // 绿色
    },
    error: {
      className: "bg-white",
      textColor: "#ef4444", // 红色
    },
    info: {
      className: "bg-info-500",
      textColor: "#ffffff",
    },
    warning: {
      className: "bg-primary-600",
      textColor: "#ffffff",
    },
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "ⓘ",
    warning: "⚠",
  };

  const currentStyle = typeStyles[type];

  return (
    <div
      className={`
        fixed top-6 right-6 z-50
        flex items-center gap-3
        px-6 py-4 rounded-xl
        shadow-lg
        animate-slideInRight
        ${currentStyle.className}
      `}
      style={{ color: currentStyle.textColor }}
    >
      <span className="text-xl">{icons[type]}</span>
      <span className="text-base font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-xl hover:opacity-70 transition-opacity"
      >
        ×
      </button>
    </div>
  );
};

// Toast管理器
interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastManagerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export const ToastManager: React.FC<ToastManagerProps> = ({
  toasts,
  removeToast,
}) => {
  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ top: `${6 + index * 80}px` }}
          className="absolute"
        >
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );
};

// useToast Hook
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => {
      // ✅ 限制最多保留 5 个 Toast，防止内存泄漏
      const newToasts = [...prev, { id, type, message }];
      // 如果超过 5 个，只保留最新的 5 个
      return newToasts.slice(-5);
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showSuccess = (message: string) => addToast("success", message);
  const showError = (message: string) => addToast("error", message);
  const showInfo = (message: string) => addToast("info", message);
  const showWarning = (message: string) => addToast("warning", message);

  return {
    toasts,
    removeToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
};

export default Toast;
