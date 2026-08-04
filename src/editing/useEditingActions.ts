/**
 * `useEditingActions` (DASH-T-0003) — builds the imperative {@link EditingActions},
 * the host {@link OperationCallbacks} view, and the post-commit event queue for
 * {@link useEditingController}. Co-located so each function stays within the
 * size/complexity ceilings.
 *
 * The session + pending-queue refs are written ONLY inside the returned handler
 * closures (never during render or in an effect), so no ref is read at render
 * time. Every content mutation routes through `apply`; each action QUEUES its
 * post-commit events rather than firing callbacks (the emitter is DASH-T-0004).
 */

import { useCallback, useMemo, useRef } from "react";
import type {
  ContentLocation,
  InsertOp,
  MoveOp,
  OperationCallbacks,
  SelectOp,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot, DeleteOp, EditOp } from "../store";
import type { EditingEvent } from "./editingEvents.js";
import type {
  EditingActions,
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

/** What {@link useEditingActions} returns for the controller to expose. */
export interface EditingActionsBundle {
  actions: EditingActions;
  operationCallbacks: OperationCallbacks;
  drainPendingEvents: () => readonly EditingEvent[];
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

export function useEditingActions(
  apply: (op: DeleteOp | EditOp | InsertOp | MoveOp | SelectOp) => ContentSnapshot,
  setSelection: (next: SelectionState) => void,
  setEditing: (next: EditingState) => void,
): EditingActionsBundle {
  const sessionRef = useRef<EditingRef | null>(null);
  const pending = useRef<EditingEvent[]>([]);

  const drainPendingEvents = useCallback((): readonly EditingEvent[] => {
    const drained = pending.current;
    pending.current = [];
    return drained;
  }, []);

  const actions = useMemo<EditingActions>(() => {
    const enqueue = (event: EditingEvent): void => {
      pending.current.push(event);
    };
    const select = (ref: EditingRef | null): void => {
      if (ref !== null) {
        apply(selectOpFor(ref));
      }
      setSelection(selectionFor(ref));
      enqueue({ type: "select", ref });
    };
    const mutate = (op: DeleteOp | EditOp | MoveOp): ContentSnapshot => {
      const snapshot = apply(op);
      enqueue({ type: "contentChange", snapshot });
      return snapshot;
    };
    return {
      select,
      startEditing: (ref: EditingRef): void => {
        select(ref);
        sessionRef.current = ref;
        setEditing({ isEditing: true, editingRef: ref });
        enqueue({ type: "editingStart", ref });
      },
      stopEditing: (): void => {
        const prev = sessionRef.current;
        sessionRef.current = null;
        setEditing(IDLE_EDITING);
        if (prev !== null) {
          enqueue({ type: "editingStop", ref: prev });
        }
      },
      add: (op: InsertOp): ContentSnapshot => {
        const snapshot = apply(op);
        enqueue({ type: "insert", op });
        enqueue({ type: "contentChange", snapshot });
        // Auto-select the inserted item at (targetId, index); no-op if the store
        // did not surface it (REQ-007). Ports useHostOps.
        const inserted = snapshot.find(
          (item) => item.targetId === op.targetId && item.index === op.index,
        );
        if (inserted !== undefined) {
          select({ targetId: inserted.targetId, contentId: inserted.content.id });
        }
        return snapshot;
      },
      remove: (op: DeleteOp): ContentSnapshot => {
        const snapshot = mutate(op);
        enqueue({ type: "remove", op });
        return snapshot;
      },
      move: (op: MoveOp): ContentSnapshot => {
        const snapshot = mutate(op);
        enqueue({ type: "move", op });
        return snapshot;
      },
      change: (op: EditOp): ContentSnapshot => mutate(op),
    };
  }, [apply, setSelection, setEditing]);

  const operationCallbacks = useOperationCallbacks(actions);

  return { actions, operationCallbacks, drainPendingEvents };
}

/**
 * The host `OperationCallbacks` view over the imperative actions, shaped for
 * `useStardustHost` (DASH-T-0010 hands this through). Each callback only INVOKES
 * an action inside a handler closure, so no ref is read during render.
 */
function useOperationCallbacks(actions: EditingActions): OperationCallbacks {
  return useMemo<OperationCallbacks>(
    () => ({
      onSelect: (targetId: string, contentId?: string): void => {
        actions.select({ targetId, contentId: contentId ?? null });
      },
      onInsert: (targetId: string, index: number, payload: InsertOp["payload"]): void => {
        actions.add({ kind: "insert", targetId, index, payload });
      },
      onMove: (from: ContentLocation, to: ContentLocation): void => {
        actions.move({ kind: "move", from, to });
      },
    }),
    [actions],
  );
}
