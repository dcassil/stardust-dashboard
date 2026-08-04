/**
 * DASH-T-0027 — `<InsertZone>`, the composable palette-insert / reorder drop
 * target (DASH-I-0002 REQ-007, Use Case 4).
 *
 * A drop target that resolves a native drag drop into a controller action:
 *  - a palette drag (a NEW block, carrying `type`) → `useEditingActions().add`
 *    of the built `InsertOp`, after applying block-defaults;
 *  - an existing item drag (carrying `contentId`, from `<MoveHandle>`) →
 *    `useEditingActions().move` of the built `MoveOp`.
 *
 * The op is built by the host's pure `opFromDataTransfer` — the overlay never
 * parses the `DataTransfer` itself. The inserted block auto-selects (controller
 * behavior). Positioning is the consumer's (a thin line between items); the zone
 * consumes geometry only via a passed `style`, never recomputing it (NFR-004).
 *
 * ## Insert-defaults boundary
 *
 * `applyInsertDefaults` is a block-registry concern and lives in the SHELL
 * (`shell/injectPipeline.ts`) — DASH-T-0010 deliberately keeps blocks-awareness
 * out of `editing`/`overlays`. So `InsertZone` does NOT import it; it takes an
 * INJECTED `applyDefaults` mapper (identity by default). The bundled `Overlays`
 * / shell wires the real blocks-aware one (DASH-T-0028), keeping the overlay
 * boundary clean (overlays → store/editing only).
 */

import type { CSSProperties, DragEvent, ReactNode } from "react";
import {
  opFromDataTransfer,
  type InsertOp,
  type MappedTarget,
} from "@stardust-cms/iframe-adapter/host";
import { useEditingActions } from "../editing";
import { SD_INSERT_ZONE } from "./overlaysTypes.js";

/** Merge a base class with an optional consumer class. */
function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

/** Map an insert payload before it is dispatched (e.g. apply block defaults). */
export type InsertPayloadMapper = (
  payload: InsertOp["payload"],
) => InsertOp["payload"];

export interface InsertZoneProps {
  /** The target the drop inserts into (or moves within). */
  target: MappedTarget;
  /** The position within the target the drop resolves to. */
  index: number;
  /**
   * Map the new block's payload before insert — the blocks-aware
   * `applyInsertDefaults` is injected here by the shell/bundled `Overlays`.
   * Defaults to identity so a standalone zone still inserts the raw payload.
   */
  applyDefaults?: InsertPayloadMapper;
  /** When `false`, the zone is inert (read-only mode, REQ-009). @default true */
  editable?: boolean;
  className?: string;
  style?: CSSProperties;
}

const identity: InsertPayloadMapper = (payload) => payload;

/**
 * A drop zone that routes palette-insert and reorder drops through the editing
 * controller. Keyboard-driven insertion is a documented STRETCH goal (the zone
 * is a pointer/drag affordance); it carries no interactive ARIA role so it stays
 * axe-clean until that lands.
 */
export function InsertZone({
  target,
  index,
  applyDefaults = identity,
  editable = true,
  className,
  style,
}: InsertZoneProps): ReactNode {
  const actions = useEditingActions();

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    if (!editable) {
      return;
    }
    event.preventDefault();
    const op = opFromDataTransfer(event.dataTransfer, {
      targetId: target.targetId,
      index,
    });
    if (op === null) {
      return;
    }
    if (op.kind === "move") {
      actions.move(op);
      return;
    }
    actions.add({ ...op, payload: applyDefaults(op.payload) });
  }

  return (
    <div
      className={joinClasses(SD_INSERT_ZONE, className)}
      data-insert-zone=""
      {...(style ? { style } : {})}
      onDragOver={(event) => {
        // Permit the drop by cancelling the default "no-drop" behavior.
        if (editable) {
          event.preventDefault();
        }
      }}
      onDrop={onDrop}
    />
  );
}
