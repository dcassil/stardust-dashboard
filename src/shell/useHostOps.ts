/**
 * The op → store → selection wiring for {@link HostShellCanvas}. Extracted from
 * `HostShell.tsx` so the canvas module stays under the size limit. Not public.
 *
 * Every overlay/panel intent (insert/move/select) becomes a {@link HostContentOp}
 * applied through the injected store's `apply`. Re-injection is NOT done here:
 * applying an op updates the store snapshot (React state), and the canvas's single
 * snapshot-change effect is the ONE place that re-injects into the iframe. This
 * keeps mutations that bypass this wiring and call `apply` directly — delete (via
 * the overlay's delete button) and field edits (via a consumer side panel) — live,
 * and avoids the double-injection that would occur if this path injected too.
 */

import { useCallback, useMemo, useState } from "react";
import type {
  ContentLocation,
  InsertOp,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot, HostContentOp } from "../store";
import type { BlockTypeRegistry } from "../blocks";
import { applyInsertDefaults } from "./injectPipeline.js";

export interface HostOps {
  /** The bundled overlay/host edit-intent callbacks. */
  operationCallbacks: OperationCallbacks;
  /** The shell-tracked selected target id (drives the target selected ring). */
  selectedTargetId: string | null;
  /** The shell-tracked selected content id (drives the item selected ring). */
  selectedContentId: string | null;
}

/**
 * Build the host op-callbacks over the store's `apply`, tracking selection in
 * local state so the overlay chrome can render a selected ring. Selection is ALSO
 * dispatched through the store as a `SelectOp` to keep every intent flowing
 * through the single `apply` entry point; the local mirror only drives visuals.
 */
export function useHostOps(
  apply: (op: HostContentOp) => ContentSnapshot,
  blockTypes: BlockTypeRegistry,
): HostOps {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );

  const dispatch = useCallback(
    (op: HostContentOp): ContentSnapshot => apply(op),
    [apply],
  );

  const onSelect = useCallback(
    (targetId: string, contentId?: string): void => {
      setSelectedTargetId(targetId);
      setSelectedContentId(contentId ?? null);
      dispatch(
        contentId !== undefined
          ? { kind: "select", targetId, contentId }
          : { kind: "select", targetId },
      );
    },
    [dispatch],
  );

  const onInsert = useCallback(
    (targetId: string, index: number, payload: InsertOp["payload"]): void => {
      // Apply the insert and use the returned snapshot to auto-select the
      // newly-inserted item so the consumer's Edit/Style panels (which read
      // `useHostSelection()`) activate immediately for the new block. The store
      // returns the fresh snapshot from `apply`; the new item is the payload now
      // sitting at (targetId, index). If it can't be found (e.g. a store that
      // reorders or rejects), we no-op the selection.
      const snapshot = dispatch({
        kind: "insert",
        targetId,
        index,
        payload: applyInsertDefaults(blockTypes, payload),
      });
      const inserted = snapshot.find(
        (item) => item.targetId === targetId && item.index === index,
      );
      if (inserted !== undefined) {
        onSelect(inserted.targetId, inserted.content.id);
      }
    },
    [dispatch, blockTypes, onSelect],
  );

  const onMove = useCallback(
    (from: ContentLocation, to: ContentLocation): void => {
      dispatch({ kind: "move", from, to });
    },
    [dispatch],
  );

  const operationCallbacks = useMemo<OperationCallbacks>(
    () => ({ onInsert, onMove, onSelect }),
    [onInsert, onMove, onSelect],
  );

  return { operationCallbacks, selectedTargetId, selectedContentId };
}
