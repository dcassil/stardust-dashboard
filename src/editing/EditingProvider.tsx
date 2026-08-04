/**
 * `EditingProvider` — the headless editing behavior provider (DASH-T-0001/0003).
 *
 * Composes the existing `StoreProvider` (the injected {@link ContentStoreAdapter}
 * enters here via the `store` prop) and, inside it, runs {@link useEditingController}
 * and publishes the three editing contexts (selection / session-state / actions)
 * read by `useSelection`, `useEditingState`, `useEditingActions`. The post-commit
 * lifecycle callbacks (REQ-006) are individual props (`onSelect`, …).
 *
 * The controller QUEUES events; the {@link useEditingEventEmitter} hook drains
 * them and dispatches to the callbacks AFTER commit, exactly once each, never
 * during render (REQ-006 / NFR-006). The shipped `HostShell` is unchanged (its
 * refactor onto this surface is DASH-T-0010).
 */

import type { ReactNode } from "react";
import { StoreProvider } from "../store";
import type { ContentStoreAdapter } from "../store";
import {
  EditingActionsContext,
  EditingStateContext,
  SelectionContext,
} from "./editingContext.js";
import { useEditingEventEmitter } from "./eventEmitter.js";
import type { EditingCallbacks } from "./editingTypes.js";
import { useEditingController } from "./useEditingController.js";

/** Props for {@link EditingProvider}. The callbacks are spread individual props. */
export interface EditingProviderProps extends EditingCallbacks {
  /** The injected content store. The ONLY place a concrete store enters. */
  store: ContentStoreAdapter;
  children?: ReactNode;
}

/**
 * Runs inside `StoreProvider` (so it can read `useContentStore`), fans the
 * controller slices out to the three separate editing contexts, and flushes
 * queued events to the callbacks post-commit.
 */
function EditingRuntimeProvider({
  callbacks,
  children,
}: {
  callbacks: EditingCallbacks;
  children: ReactNode;
}): ReactNode {
  const { selection, editing, actions, drainPendingEvents } =
    useEditingController();

  useEditingEventEmitter(drainPendingEvents, callbacks);

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
