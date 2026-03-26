import { useEffect } from "react";

interface UseIdentityPageEffectsParams {
  loadCurrentMachineIds: () => Promise<void>;
  loadAutoUpdateStatus: () => Promise<void>;
  loadCustomCursorPath: () => Promise<void>;
  setIsWindows: (value: boolean) => void;
}

export function useIdentityPageEffects({
  loadCurrentMachineIds,
  loadAutoUpdateStatus,
  loadCustomCursorPath,
  setIsWindows,
}: UseIdentityPageEffectsParams) {
  useEffect(() => {
    const platform = navigator.platform.toLowerCase();
    const isWindowsOS = platform.includes("win");
    setIsWindows(isWindowsOS);

    void loadCurrentMachineIds();
    void loadAutoUpdateStatus();
    if (isWindowsOS) {
      void loadCustomCursorPath();
    }
  }, [loadAutoUpdateStatus, loadCurrentMachineIds, loadCustomCursorPath, setIsWindows]);
}
