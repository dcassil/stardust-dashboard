/**
 * `useOperationCallbacks` (DASH-T-0010) — the shell-side adapter that turns the
 * behavior layer's imperative {@link useEditingActions} into the host
 * `OperationCallbacks` (`onSelect`/`onInsert`/`onMove`) that `useStardustHost`
 * expects. Replaces the private `useHostOps`.
 *
 * BOUNDARY: insert-defaults (`applyInsertDefaults`, a block-registry concern)
 * live HERE, in the shell, not in the `editing` controller — so `editing` never
 * imports `blocks`. `onInsert` fills the payload defaults, then hands a complete
 * `InsertOp` to `actions.add`, which applies it through the store and
 * auto-selects the inserted item (REQ-007). The single re-injection stays owned
 * by the canvas's snapshot-change effect.
 */

import { useMemo } from "react";
import type {
  ContentLocation,
  InsertOp,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import { useEditingActions } from "../editing";
import type { BlockTypeRegistry } from "../blocks";
import { applyInsertDefaults } from "./injectPipeline.js";

/** Build the host op-callbacks over the editing actions + block-type defaults. */
export function useOperationCallbacks(
  blockTypes: BlockTypeRegistry,
): OperationCallbacks {
  const actions = useEditingActions();
  return useMemo<OperationCallbacks>(
    () => ({
      onSelect: (targetId: string, contentId?: string): void => {
        actions.select({ targetId, contentId: contentId ?? null });
      },
      onInsert: (
        targetId: string,
        index: number,
        payload: InsertOp["payload"],
      ): void => {
        actions.add({
          kind: "insert",
          targetId,
          index,
          payload: applyInsertDefaults(blockTypes, payload),
        });
      },
      onMove: (from: ContentLocation, to: ContentLocation): void => {
        actions.move({ kind: "move", from, to });
      },
    }),
    [actions, blockTypes],
  );
}
