import type { IdentityPageActionsContext } from "./identityPageActionTypes.ts";
import { useIdentityPageConfirmActions } from "./useIdentityPageConfirmActions.ts";
import { useIdentityPageDataActions } from "./useIdentityPageDataActions.ts";

export function useIdentityPageActions(context: IdentityPageActionsContext) {
  const dataActions = useIdentityPageDataActions(context);
  const confirmActions = useIdentityPageConfirmActions({
    ...context,
    loadBackups: dataActions.loadBackups,
    handleReset: dataActions.handleReset,
    handleCompleteReset: dataActions.handleCompleteReset,
    handleSyncAccountToUser: dataActions.handleSyncAccountToUser,
  });

  return {
    ...dataActions,
    ...confirmActions,
  };
}
