/**
 * DASH-T-0027 — `<MoveHandle>`, the reorder drag SOURCE (DASH-I-0002 REQ-006).
 *
 * A focusable, accessible `<button>` that, on drag start, populates the drop's
 * `DataTransfer` with the host's move keys ({@link DATA_TRANSFER_KEYS}) so a drop
 * on an `<InsertZone>` (or the host target area) resolves via `opFromDataTransfer`
 * to a `MoveOp` and reaches `useEditingActions().move`. The handle owns no
 * geometry (NFR-004) — it flows inside `<ContentOverlay.Actions>` or is placed by
 * the consumer. Keyboard reorder is a documented STRETCH goal; the control is at
 * least focusable with an accessible name today.
 */

import type { CSSProperties, DragEvent, ReactNode } from "react";
import { DATA_TRANSFER_KEYS } from "@stardust-cms/iframe-adapter/host";
import type { EditingRef } from "../editing";
import { useContentOverlayContext } from "./contentOverlayContext.js";
import { SD_MOVE_HANDLE } from "./overlaysTypes.js";

/** Merge a base class with an optional consumer class. */
function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

export interface MoveHandleProps {
  /** The item being dragged, when used standalone (see `itemRef` on the ring). */
  itemRef?: EditingRef;
  /** The item's source index, when used standalone. */
  index?: number;
  /** When `false`, the handle is disabled and not draggable (REQ-009). @default true */
  editable?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * The reorder grab handle. Resolves its `ref`/`index` from the compound context
 * with an explicit-prop fallback, so it works inside `<ContentOverlay>` or
 * standalone.
 */
export function MoveHandle({
  itemRef,
  index,
  editable = true,
  className,
  style,
}: MoveHandleProps): ReactNode {
  const ctx = useContentOverlayContext();
  const resolvedRef = itemRef ?? ctx?.ref;
  const resolvedIndex = index ?? ctx?.child.index;

  // Nothing to relocate (no resolvable item) → render nothing.
  if (resolvedRef === undefined || resolvedIndex === undefined) {
    return null;
  }

  // Hoist the narrowed values so the drag handler closure keeps their defined
  // types (TS drops guard-narrowing of the outer consts inside a nested fn).
  const ref: EditingRef = resolvedRef;
  const sourceIndex: number = resolvedIndex;

  function onDragStart(event: DragEvent<HTMLButtonElement>): void {
    const { dataTransfer } = event;
    dataTransfer.setData(DATA_TRANSFER_KEYS.isMove, "true");
    dataTransfer.setData(DATA_TRANSFER_KEYS.sourceTarget, ref.targetId);
    if (ref.contentId !== null) {
      dataTransfer.setData(DATA_TRANSFER_KEYS.contentId, ref.contentId);
    }
    dataTransfer.setData(DATA_TRANSFER_KEYS.sourceIndex, String(sourceIndex));
  }

  return (
    <button
      type="button"
      className={joinClasses(SD_MOVE_HANDLE, className)}
      title="Move block"
      aria-label="Move block"
      draggable={editable}
      disabled={!editable}
      {...(style ? { style } : {})}
      onDragStart={onDragStart}
    >
      ⠿
    </button>
  );
}
