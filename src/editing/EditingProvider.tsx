/**
 * `EditingProvider` — the headless editing behavior provider (DASH-T-0001).
 *
 * Composes the existing `StoreProvider` (the injected {@link ContentStoreAdapter}
 * enters here via the `store` prop) and, inside it, publishes the three editing
 * contexts (selection / session-state / actions) read by `useSelection`,
 * `useEditingState`, `useEditingActions`. The post-commit lifecycle callbacks
 * (REQ-006) are individual props (`onSelect`, `onEditingStart`, …). Usable
 * standalone for progressive adoption, or mounted by `AdminProvider`.
 *
 * @internal skeleton — the contexts carry real-but-minimal session behavior
 * (see {@link useEditingRuntime}); the shipped `HostShell` is unchanged. Real
 * session/eventing behavior is DASH-T-0003/0004.
 */

import type { ReactNode } from "react";
import { StoreProvider } from "../store";
import type { ContentStoreAdapter } from "../store";
import {
  EditingActionsContext,
  EditingStateContext,
  SelectionContext,
} from "./editingContext.js";
import type { EditingCallbacks } from "./editingTypes.js";
import { useEditingRuntime } from "./useEditingRuntime.js";

/** Props for {@link EditingProvider}. The callbacks are spread individual props. */
export interface EditingProviderProps extends EditingCallbacks {
  /** The injected content store. The ONLY place a concrete store enters. */
  store: ContentStoreAdapter;
  children?: ReactNode;
}

/**
 * Runs inside `StoreProvider` (so it can read `useContentStore`) and fans the
 * runtime slices out to the three separate editing contexts.
 */
function EditingRuntimeProvider({
  callbacks,
  children,
}: {
  callbacks: EditingCallbacks;
  children: ReactNode;
}): ReactNode {
  const { selection, editing, actions } = useEditingRuntime(callbacks);
  return (
    <SelectionContext.Provider value={selection}>
      <EditingStateContext.Provider value={editing}>
        <EditingActionsContext.Provider value={actions}>
          {children}
        </EditingActionsContext.Provider>
      </EditingStateContext.Provider>
    </SelectionContext.Provider>
  );
}

export function EditingProvider({
  store,
  children,
  ...callbacks
}: EditingProviderProps): ReactNode {
  return (
    <StoreProvider store={store}>
      <EditingRuntimeProvider callbacks={callbacks}>
        {children}
      </EditingRuntimeProvider>
    </StoreProvider>
  );
}
