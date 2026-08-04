/**
 * The editing-session runtime hook (DASH-T-0001 skeleton).
 *
 * Owns selection + session state and builds the STABLE {@link EditingActions}
 * object. Must be called inside a `StoreProvider` (it reads `useContentStore`),
 * which `EditingProvider` guarantees. Deliberately thin: content actions call
 * `apply` and fire the matching callback; `select`/`startEditing`/`stopEditing`
 * manage interaction state and route an inert `select` op through the store to
 * preserve the single-`apply`-entry-point invariant. The real state machine,
 * auto-select-on-add lookup, and once-per-action post-commit emitter are
 * DASH-T-0003/0004; the NAMES/SHAPES here are frozen.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { InsertOp, MoveOp, SelectOp } from "@stardust-cms/iframe-adapter/host";
import { useContentStore } from "../store";
import type { ContentSnapshot, DeleteOp, EditOp } from "../store";
import type {
  EditingActions,
  EditingCallbacks,
  EditingRef,
  EditingState,
  SelectionState,
} from "./editingTypes.js";

const EMPTY_SELECTION: SelectionState = {
  selectedTargetId: null,
  selectedContentId: null,
  selectedRef: null,
};

const IDLE_EDITING: EditingState = { isEditing: false, editingRef: null };

/** The slices `EditingProvider` feeds into the three editing contexts. */
export interface EditingRuntime {
  selection: SelectionState;
  editing: EditingState;
  actions: EditingActions;
}

/** Build a `select` host op from an {@link EditingRef} (`null` id → absent). */
function selectOpFor(ref: EditingRef): SelectOp {
  return ref.contentId === null
    ? { kind: "select", targetId: ref.targetId }
    : { kind: "select", targetId: ref.targetId, contentId: ref.contentId };
}

/** Derive the selection slice from a ref (or the empty selection). */
function selectionFor(ref: EditingRef | null): SelectionState {
  return ref === null
    ? EMPTY_SELECTION
    : {
        selectedTargetId: ref.targetId,
        selectedContentId: ref.contentId,
        selectedRef: ref,
      };
}

export function useEditingRuntime(
  callbacks: EditingCallbacks | undefined,
): EditingRuntime {
  const { apply } = useContentStore();
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const [editing, setEditing] = useState<EditingState>(IDLE_EDITING);

  // Latest-value refs so the actions object stays referentially stable while
  // still reading current session/callbacks (updated post-commit, not in render).
  const editingRef = useRef(editing);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    editingRef.current = editing;
    callbacksRef.current = callbacks;
  }, [editing, callbacks]);

  const actions = useMemo<EditingActions>(() => {
    const cb = (): EditingCallbacks | undefined => callbacksRef.current;
    const select = (ref: EditingRef | null): void => {
      if (ref !== null) {
        apply(selectOpFor(ref));
      }
      setSelection(selectionFor(ref));
      cb()?.onSelect?.(ref);
    };
    return {
      select,
      startEditing: (ref: EditingRef): void => {
        select(ref);
        setEditing({ isEditing: true, editingRef: ref });
        cb()?.onEditingStart?.(ref);
      },
      stopEditing: (): void => {
        const prev = editingRef.current.editingRef;
        setEditing(IDLE_EDITING);
        if (prev !== null) {
          cb()?.onEditingStop?.(prev);
        }
      },
      add: (op: InsertOp): ContentSnapshot => {
        const snapshot = apply(op);
        // Skeleton auto-select: target-level. DASH-T-0003 locates the inserted
        // item at (targetId, index) in the snapshot to select it precisely.
        select({ targetId: op.targetId, contentId: null });
        cb()?.onInsert?.(op);
        cb()?.onContentChange?.(snapshot);
        return snapshot;
      },
      remove: (op: DeleteOp): ContentSnapshot => {
        const snapshot = apply(op);
        cb()?.onRemove?.(op);
        cb()?.onContentChange?.(snapshot);
        return snapshot;
      },
      move: (op: MoveOp): ContentSnapshot => {
        const snapshot = apply(op);
        cb()?.onMove?.(op);
        cb()?.onContentChange?.(snapshot);
        return snapshot;
      },
      change: (op: EditOp): ContentSnapshot => {
        const snapshot = apply(op);
        cb()?.onContentChange?.(snapshot);
        return snapshot;
      },
    };
  }, [apply]);

  return { selection, editing, actions };
}
