/**
 * `EditingProvider` — the headless editing behavior provider (DASH-T-0001/0003).
 *
 * Composes the existing `StoreProvider` (the injected {@link ContentStoreAdapter}
 * enters here via the `store` prop) and, inside it, runs {@link useEditingController}
 * and publishes the three editing contexts (selection / session-state / actions)
 * read by `useSelection`, `useEditingState`, `useEditingActions`. The post-commit
 * lifecycle callbacks (REQ-006) are individual props (`onSelect`, …).
 *
 * The controller QUEUES events; an interim post-commit effect here drains them
 * and dispatches to the callbacks AFTER commit (never during render — NFR-006).
 * DASH-T-0004 EXTRACTS this effect into `editing/eventEmitter.ts` and hardens it
 * (once-per-action guarantees, ordering, StrictMode safety). The shipped
 * `HostShell` is unchanged (its refactor onto this surface is DASH-T-0010).
 */

import { useEffect, useRef, type ReactNode } from "react";
import { StoreProvider } from "../store";
import type { ContentStoreAdapter } from "../store";
import {
  EditingActionsContext,
  EditingStateContext,
  SelectionContext,
} from "./editingContext.js";
import { dispatchEditingEvent } from "./editingEvents.js";
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

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Interim post-commit emitter (DASH-T-0004 extracts + hardens this): after
  // each commit, drain any events the controller queued during an action and
  // dispatch them to the callbacks. Runs post-commit, so callbacks never fire
  // during render (NFR-006); draining an empty queue is a no-op.
  useEffect(() => {
    for (const event of drainPendingEvents()) {
      dispatchEditingEvent(event, callbacksRef.current);
    }
  });

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
