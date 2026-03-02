import React, { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (checkboxValue?: boolean) => void;
  onCancel: () => void;
  checkboxLabel?: string;
  checkboxDefaultChecked?: boolean;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  checkboxLabel,
  checkboxDefaultChecked = false,
  confirmText = "确认",
  cancelText = "取消",
  type = "info",
}) => {
  const [checkboxValue, setCheckboxValue] = useState(checkboxDefaultChecked);

  const handleConfirm = () => {
    onConfirm(checkboxLabel ? checkboxValue : undefined);
  };

  const typeIcons = {
    danger: "🚨",
    warning: "⚠️",
    info: "ℹ️",
  };

  const confirmButtonVariant = type === "danger" ? "danger" : "primary";

  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-center py-4">
        <div className="text-5xl mb-4">{typeIcons[type]}</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 whitespace-pre-line mb-4">{message}</p>

        {checkboxLabel && (
          <div className="flex items-center justify-center gap-2 mt-6 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="confirm-checkbox"
              checked={checkboxValue}
              onChange={(e) => setCheckboxValue(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label
              htmlFor="confirm-checkbox"
              className="text-sm text-gray-700 cursor-pointer"
            >
              {checkboxLabel}
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
};

// useConfirmDialog Hook
// eslint-disable-next-line react-refresh/only-export-components
export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: (checkboxValue?: boolean) => void;
    checkboxLabel?: string;
    checkboxDefaultChecked?: boolean;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = (options: Omit<typeof dialogState, "show">) => {
    setDialogState({ ...options, show: true });
  };

  const hideConfirm = () => {
    setDialogState((prev) => ({ ...prev, show: false }));
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={dialogState.show}
      title={dialogState.title}
      message={dialogState.message}
      onConfirm={(checkboxValue) => {
        dialogState.onConfirm(checkboxValue);
        hideConfirm();
      }}
      onCancel={hideConfirm}
      checkboxLabel={dialogState.checkboxLabel}
      checkboxDefaultChecked={dialogState.checkboxDefaultChecked}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      type={dialogState.type}
    />
  );

  return {
    showConfirm,
    hideConfirm,
    ConfirmDialog: ConfirmDialogComponent,
  };
};

export default ConfirmDialog;
