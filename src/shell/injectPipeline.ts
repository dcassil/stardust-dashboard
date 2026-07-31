/**
 * The snapshot re-injection pipeline for {@link HostShellCanvas} (ported from the
 * demo `useContentStore`). Extracted from `HostShell.tsx` so the canvas module
 * stays under the size limit. Not part of the public API.
 *
 * `useInject` returns a stable `inject(next)` callback that pushes every payload
 * of a snapshot into the iframe via `cms/sendElements`, then blanks any orphaned
 * trailing slots left by a delete/move that shortened a target (the iframe merge
 * never deletes; sending an empty item clears the slot). It tracks the previous
 * max index per target across calls.
 */

import { useCallback, useRef } from "react";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type { InsertOp } from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot } from "../store";
import { findBlockType } from "../blocks";
import type { BlockTypeRegistry } from "../blocks";
import { useSendElements } from "./useSendElements.js";

/** The highest occupied index per target, from a snapshot. */
export function maxIndexByTarget(snapshot: ContentSnapshot): Map<string, number> {
  const max = new Map<string, number>();
  for (const p of snapshot) {
    max.set(p.targetId, Math.max(max.get(p.targetId) ?? -1, p.index));
  }
  return max;
}

/** An empty content payload used to blank an orphaned trailing slot. */
function blankPayload(targetId: string, index: number): ContentPayload {
  const blankId = `__blank-${targetId}-${String(index)}`;
  return {
    targetId,
    contentId: blankId,
    index,
    content: { id: blankId, type: "text", value: "" },
  };
}

/**
 * Merge the block registry's `defaultValue()` for a newly inserted block into the
 * insert payload. Replaces the demo's hard-coded text/image switch — the registry
 * is now the single source of per-type insert defaults. A block type with no
 * `defaultValue` (or no matching registry entry) seeds nothing. A bare-value
 * result is written to `payload.value`; a partial-`CmsContent` result is spread
 * over the payload so a block can seed more than `value` (e.g. `column`).
 */
export function applyInsertDefaults(
  blockTypes: BlockTypeRegistry,
  payload: InsertOp["payload"],
): InsertOp["payload"] {
  const blockType = findBlockType(blockTypes, payload.type);
  const seed = blockType?.defaultValue?.();
  if (seed === undefined) {
    return payload;
  }
  if (typeof seed === "object") {
    return { ...payload, ...seed };
  }
  return { ...payload, value: seed };
}

/**
 * Build the stable `inject(next)` callback. Seeds its per-target max-index
 * tracking from `initialSnapshot` so the first delete/move blanks correctly.
 */
export function useInject(
  initialSnapshot: ContentSnapshot,
): (next: ContentSnapshot) => void {
  const sendElements = useSendElements();

  // Track the previous max index per target so we can blank orphaned trailing
  // slots after a delete/move that shortens a target.
  const prevMaxRef = useRef<Map<string, number>>(
    maxIndexByTarget(initialSnapshot),
  );

  return useCallback(
    (next: ContentSnapshot): void => {
      for (const payload of next) {
        void sendElements(payload).catch(() => {
          /* not connected yet / peer gone */
        });
      }
      const nextMax = maxIndexByTarget(next);
      for (const [targetId, prevMax] of prevMaxRef.current) {
        const currentMax = nextMax.get(targetId) ?? -1;
        for (let i = currentMax + 1; i <= prevMax; i++) {
          void sendElements(blankPayload(targetId, i)).catch(() => {
            /* ignore */
          });
        }
      }
      prevMaxRef.current = nextMax;
    },
    [sendElements],
  );
}
