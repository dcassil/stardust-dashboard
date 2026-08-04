/**
 * The editing post-commit EVENT vocabulary (DASH-T-0003) — the hand-off
 * interface between the controller (which QUEUES events during an action) and
 * the emitter (DASH-T-0004, which flushes them to {@link EditingCallbacks}
 * post-commit, never during render — NFR-006).
 *
 * `EditingEvent` is a closed discriminated union on `type`, mirroring the store-
 * op mapping table's "Events" column. `dispatchEditingEvent` maps one event to
 * the matching callback; it is pure (no scheduling) so the emitter owns WHEN it
 * runs. Internal to the editing layer — not part of the frozen public surface.
 */

import type { InsertOp, MoveOp } from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot, DeleteOp } from "../store";
import type { EditingCallbacks, EditingRef } from "./editingTypes.js";

/** One queued post-commit editing event (see the Detailed Design mapping table). */
export type EditingEvent =
  | { readonly type: "select"; readonly ref: EditingRef | null }
  | { readonly type: "editingStart"; readonly ref: EditingRef }
  | { readonly type: "editingStop"; readonly ref: EditingRef }
  | { readonly type: "insert"; readonly op: InsertOp }
  | { readonly type: "remove"; readonly op: DeleteOp }
  | { readonly type: "move"; readonly op: MoveOp }
  | { readonly type: "contentChange"; readonly snapshot: ContentSnapshot };

/** The selection/session lifecycle events (ref-carrying). */
type LifecycleEvent = Extract<
  EditingEvent,
  { type: "select" | "editingStart" | "editingStop" }
>;

/** The content-mutation events (op/snapshot-carrying). */
type ContentEvent = Extract<
  EditingEvent,
  { type: "insert" | "remove" | "move" | "contentChange" }
>;

function dispatchLifecycle(
  event: LifecycleEvent,
  callbacks: EditingCallbacks,
): void {
  switch (event.type) {
    case "select":
      callbacks.onSelect?.(event.ref);
      return;
    case "editingStart":
      callbacks.onEditingStart?.(event.ref);
      return;
    case "editingStop":
      callbacks.onEditingStop?.(event.ref);
      return;
  }
}

function dispatchContent(event: ContentEvent, callbacks: EditingCallbacks): void {
  switch (event.type) {
    case "insert":
      callbacks.onInsert?.(event.op);
      return;
    case "remove":
      callbacks.onRemove?.(event.op);
      return;
    case "move":
      callbacks.onMove?.(event.op);
      return;
    case "contentChange":
      callbacks.onContentChange?.(event.snapshot);
      return;
  }
}

/**
 * Dispatch a single queued {@link EditingEvent} to the matching optional
 * callback. Pure — the emitter (DASH-T-0004) decides when to call this
 * post-commit. Split by discriminant group so each function stays within the
 * complexity ceiling.
 */
export function dispatchEditingEvent(
  event: EditingEvent,
  callbacks: EditingCallbacks,
): void {
  if (
    event.type === "insert" ||
    event.type === "remove" ||
    event.type === "move" ||
    event.type === "contentChange"
  ) {
    dispatchContent(event, callbacks);
  } else {
    dispatchLifecycle(event, callbacks);
  }
}
