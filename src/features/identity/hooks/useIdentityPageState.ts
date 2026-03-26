import { useState } from "react";
import type { BackupInfo, MachineIds, ResetResult, RestoreResult } from "@/types/auth";

export type IdentityStep =
  | "menu"
  | "select"
  | "preview"
  | "confirm"
  | "result"
  | "reset"
  | "complete_reset"
  | "custom_path_config";

export type WindowsUserInfo = { username: string; has_cursor: boolean };

export function useIdentityPageState() {
  const [currentStep, setCurrentStep] = useState<IdentityStep>("menu");
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<MachineIds | null>(null);
  const [currentMachineIds, setCurrentMachineIds] = useState<MachineIds | null>(null);
  const [machineIdFileContent, setMachineIdFileContent] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [customCursorPath, setCustomCursorPath] = useState("");
  const [currentCustomPath, setCurrentCustomPath] = useState<string | null>(null);
  const [isWindows, setIsWindows] = useState(false);
  const [autoUpdateDisabled, setAutoUpdateDisabled] = useState<boolean | null>(null);
  const [windowsUsers, setWindowsUsers] = useState<WindowsUserInfo[]>([]);
  const [syncingUser, setSyncingUser] = useState<string | null>(null);

  return {
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
  };
}
