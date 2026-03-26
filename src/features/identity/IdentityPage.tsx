import { useCallback } from "react";
import { Card, Icon, LoadingSpinner, ToastManager, useConfirmDialog, useToast } from "@/components";
import {
  BackupList,
  BackupPreviewCard,
  CurrentMachineIdsCard,
  CustomPathConfig,
  IdentityMenu,
  ResultDisplay,
} from "./components";
import { useIdentityPageActions } from "./hooks/useIdentityPageActions";
import { useIdentityPageEffects } from "./hooks/useIdentityPageEffects";
import { useIdentityPageState } from "./hooks/useIdentityPageState";
import { useIdentityPageViewModel } from "./hooks/useIdentityPageViewModel";

const IdentityPage = () => {
  const {
    currentStep,
    setCurrentStep,
    loading,
    setLoading,
    backups,
    setBackups,
    selectedBackup,
    setSelectedBackup,
    selectedIds,
    setSelectedIds,
    currentMachineIds,
    setCurrentMachineIds,
    machineIdFileContent,
    setMachineIdFileContent,
    restoreResult,
    setRestoreResult,
    resetResult,
    setResetResult,
    customCursorPath,
    setCustomCursorPath,
    currentCustomPath,
    setCurrentCustomPath,
    isWindows,
    setIsWindows,
    autoUpdateDisabled,
    setAutoUpdateDisabled,
    windowsUsers,
    setWindowsUsers,
    syncingUser,
    setSyncingUser,
  } = useIdentityPageState();

  const { toasts, removeToast, showSuccess, showError } = useToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  const {
    loadAutoUpdateStatus,
    loadCustomCursorPath,
    loadCurrentMachineIds,
    loadBackups,
    handleBackupSelect,
    handleRestore,
    handleDeleteBackup,
    handleOpenLogDirectory,
    handleGetLogPath,
    handleSetCustomPath,
    handleClearCustomPath,
    handleFillDetectedPath,
    handleBrowsePath,
    handleToggleAutoUpdate,
    handleDetectWindowsUsers,
    showResetConfirm,
    showCompleteResetConfirm,
    showSyncUserConfirm,
  } = useIdentityPageActions({
    customCursorPath,
    autoUpdateDisabled,
    selectedBackup,
    setCurrentStep,
    setLoading,
    setBackups,
    setSelectedBackup,
    setSelectedIds,
    setRestoreResult,
    setResetResult,
    setCurrentMachineIds,
    setMachineIdFileContent,
    setCurrentCustomPath,
    setCustomCursorPath,
    setAutoUpdateDisabled,
    setWindowsUsers,
    setSyncingUser,
    showSuccess,
    showError,
    showConfirm,
  });

  useIdentityPageEffects({
    loadCurrentMachineIds,
    loadAutoUpdateStatus,
    loadCustomCursorPath,
    setIsWindows,
  });

  const {
    isInitialLoading,
    showCurrentIdsCard,
    showMenu,
    showCustomPathConfig,
    showBackupSelect,
    showBackupPreview,
    showRestoreProgress,
    showRestoreResult,
    showResetResult,
  } = useIdentityPageViewModel({
    currentStep,
    loading,
    backups,
    selectedBackup,
    selectedIds,
    currentMachineIds,
    machineIdFileContent,
    restoreResult,
    resetResult,
  });

  const handleRestoreResultBack = useCallback(() => {
    setCurrentStep("menu");
    setRestoreResult(null);
    setSelectedBackup(null);
    setSelectedIds(null);
  }, [setCurrentStep, setRestoreResult, setSelectedBackup, setSelectedIds]);

  const handleResetResultBack = useCallback(() => {
    setCurrentStep("menu");
    setResetResult(null);
  }, [setCurrentStep, setResetResult]);

  if (isInitialLoading) {
    return <LoadingSpinner message="正在加载 Machine ID 信息..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
          <Icon name="plug" size={32} />
          Machine ID 管理
        </h1>
        <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
          管理 Cursor 的 Machine ID，包括查看、备份、恢复和重置
        </p>
      </div>

      {showCurrentIdsCard && currentMachineIds && (
        <CurrentMachineIdsCard
          currentMachineIds={currentMachineIds}
          machineIdFileContent={machineIdFileContent}
        />
      )}

      {showMenu && (
        <IdentityMenu
          loading={loading}
          autoUpdateDisabled={autoUpdateDisabled}
          isWindows={isWindows}
          windowsUsers={windowsUsers}
          syncingUser={syncingUser}
          currentCustomPath={currentCustomPath}
          onLoadBackups={loadBackups}
          onShowResetConfirm={showResetConfirm}
          onShowCompleteResetConfirm={showCompleteResetConfirm}
          onToggleAutoUpdate={handleToggleAutoUpdate}
          onDetectWindowsUsers={handleDetectWindowsUsers}
          onSyncUser={showSyncUserConfirm}
          onGetLogPath={handleGetLogPath}
          onOpenLogDirectory={handleOpenLogDirectory}
          onOpenCustomPathConfig={() => setCurrentStep("custom_path_config")}
        />
      )}

      {showCustomPathConfig && (
        <CustomPathConfig
          customCursorPath={customCursorPath}
          currentCustomPath={currentCustomPath}
          onPathChange={setCustomCursorPath}
          onSetPath={handleSetCustomPath}
          onFillDetectedPath={handleFillDetectedPath}
          onClearPath={handleClearCustomPath}
          onBrowsePath={handleBrowsePath}
          onBack={() => setCurrentStep("menu")}
        />
      )}

      {showBackupSelect && (
        <BackupList
          backups={backups}
          onBackupSelect={handleBackupSelect}
          onDeleteBackup={handleDeleteBackup}
          onBack={() => setCurrentStep("menu")}
        />
      )}

      {showBackupPreview && selectedBackup && selectedIds && (
        <BackupPreviewCard
          backup={selectedBackup}
          machineIds={selectedIds}
          loading={loading}
          onConfirm={handleRestore}
          onBack={() => setCurrentStep("select")}
        />
      )}

      {showRestoreProgress && (
        <Card>
          <Card.Content className="py-12 text-center">
            <div className="mb-4 text-4xl">⏳</div>
            <h2 className="mb-2 text-lg font-medium" style={{ color: "var(--text-primary)" }}>
              正在恢复...
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>请稍候，正在恢复 Machine ID</p>
          </Card.Content>
        </Card>
      )}

      {showRestoreResult && restoreResult && (
        <ResultDisplay
          result={restoreResult}
          type="restore"
          onBack={handleRestoreResultBack}
          onRefresh={loadCurrentMachineIds}
        />
      )}

      {showResetResult && resetResult && (
        <ResultDisplay
          result={resetResult}
          type={currentStep === "complete_reset" ? "complete_reset" : "reset"}
          onBack={handleResetResultBack}
          onRefresh={loadCurrentMachineIds}
        />
      )}

      <ToastManager toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog />
    </div>
  );
};

export default IdentityPage;
