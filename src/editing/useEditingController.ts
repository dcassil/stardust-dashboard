/**
 * `useEditingController` (DASH-T-0003) — the editing state-machine hook, the
 * successor to `src/shell/useHostOps.ts`. It owns selection + editing-session
 * state and delegates the imperative {@link EditingActions}, the host
 * `OperationCallbacks` view (for the shell — DASH-T-0010), and the post-commit
 * event queue (for the emitter — DASH-T-0004) to {@link useControllerActions}.
 *
 * BOUNDARY: `add(op: InsertOp)` receives a COMPLETE op. Insert-defaults
 * (`applyInsertDefaults`, a block-registry concern) stay in the shell so this
 * layer never imports `blocks` (the frozen `editing↛blocks` boundary). The store
 * is read via `useContentStore()`; every content mutation routes through
 * `store.apply` (REQ-005). Must run inside a `StoreProvider`.
 */

import { useState } from "react";
import type { OperationCallbacks } from "@stardust-cms/iframe-adapter/host";
import { useContentStore } from "../store";
import type { EditingEvent } from "./editingEvents.js";
import { useControllerActions } from "./useControllerActions.js";
import type {
  EditingActions,
  EditingState,
  SelectionState,
} from "./editingTypes.js";

const EMPTY_SELECTION: SelectionState = {
  selectedTargetId: null,
  selectedContentId: null,
  selectedRef: null,
};

const IDLE_EDITING: EditingState = { isEditing: false, editingRef: null };

/** The full controller surface the provider fans out + the emitter drains. */
export interface EditingController {
  selection: SelectionState;
  editing: EditingState;
  actions: EditingActions;
  /** The host op-callbacks view, shaped for `useStardustHost` (DASH-T-0010). */
  operationCallbacks: OperationCallbacks;
  /** Drain the queued post-commit events (for the DASH-T-0004 emitter). */
  drainPendingEvents: () => readonly EditingEvent[];
}

export function useEditingController(): EditingController {
  const { apply } = useContentStore();
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const [editing, setEditing] = useState<EditingState>(IDLE_EDITING);

  const { actions, operationCallbacks, drainPendingEvents } = useControllerActions(
    apply,
    setSelection,
    setEditing,
  );

  return { selection, editing, actions, operationCallbacks, drainPendingEvents };
}
