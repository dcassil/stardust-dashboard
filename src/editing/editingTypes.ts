/**
 * FROZEN PUBLIC CONTRACT — the editing-layer type surface (DASH-T-0001 spike).
 *
 * These shapes are the contract every downstream task and sibling initiative
 * (DASH-I-0002/0003/0004/0005) designs against. Their NAMES are locked here and
 * copied verbatim into DASH-I-0001's Detailed Design; changing one later is a
 * deliberate, reviewed contract change — not silent drift. The shapes track the
 * initiative's REQ-002/003/004/006 and Class Diagrams exactly.
 *
 * The bodies are minimal skeleton implementations sufficient to compile the
 * provider/hook skeleton and prove narrow subscription. DASH-T-0002 (editing
 * contract) and DASH-T-0003 (controller state machine) implement real behavior
 * WITHOUT renaming any exported identifier.
 *
 * BOUNDARY (per DASH-T-0001 AC): this module imports ONLY React, the `store`
 * seam (via its barrel), and opaque host op/ref types from
 * `@stardust-cms/iframe-adapter` — never a concrete store, never geometry.
 */

import type { InsertOp, MoveOp } from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot, DeleteOp, EditOp } from "../store";

/**
 * The normalized address `select`/`startEditing` operate on. A ref with a `null`
 * `contentId` targets a whole target area (REQ-002 / Class Diagrams). `contentId`
 * is `string | null` (NOT optional) — consistent with the entire selection
 * surface (`SelectionState.selectedContentId`, the pre-existing `HostSelection`)
 * and ergonomic under `exactOptionalPropertyTypes`, where consumers routinely
 * hold a `string | null` id and can pass it straight through. The internal
 * mapping to the host `SelectOp`'s `{ targetId, contentId? }` collapses `null`
 * to an absent field.
 */
export interface EditingRef {
  readonly targetId: string;
  readonly contentId: string | null;
}

/**
 * The current selection, served by {@link useSelection} (REQ-002). Held in its
 * own React context so a selection-only consumer does NOT re-render when the
 * editing session changes (NFR-005 narrow subscription). `selectedRef` is the
 * normalized {@link EditingRef}, or `null` when nothing is selected.
 */
export interface SelectionState {
  readonly selectedTargetId: string | null;
  readonly selectedContentId: string | null;
  readonly selectedRef: EditingRef | null;
}

/**
 * The editing-SESSION state, served by {@link useEditingState} (REQ-003) — the
 * item passed to the last `startEditing` that has not been stopped. Distinct
 * from selection: `startEditing(ref)` implies selection, but `select` does not
 * start a session. `editingRef` is `null` when not editing.
 */
export interface EditingState {
  readonly isEditing: boolean;
  readonly editingRef: EditingRef | null;
}

/**
 * The imperative editing action API, served by {@link useEditingActions}
 * (REQ-004). This object is referentially STABLE across renders, so an
 * actions-only consumer never re-renders (NFR-005). The content-mutating actions
 * (`add`/`remove`/`move`/`change`) each map onto exactly one existing
 * `HostContentOp`, route through the injected store's `apply`, and return the
 * resulting {@link ContentSnapshot} (mirroring `apply`). `select`/`startEditing`/
 * `stopEditing` mutate interaction state only (dispatching an inert `select` op
 * to preserve the single-`apply`-entry-point invariant).
 *
 * @internal skeleton — real session/eventing semantics are DASH-T-0003/0004; the
 * NAMES and SHAPES here are frozen.
 */
export interface EditingActions {
  /** Select a ref (or clear selection with `null`). */
  select(ref: EditingRef | null): void;
  /** Open an editing session on `ref` (implies selecting it). */
  startEditing(ref: EditingRef): void;
  /** Close the current editing session (selection is left intact). */
  stopEditing(): void;
  /** Insert a new block; auto-selects the inserted item (REQ-007). */
  add(op: InsertOp): ContentSnapshot;
  /** Remove an existing content item. */
  remove(op: DeleteOp): ContentSnapshot;
  /** Relocate an existing content item. */
  move(op: MoveOp): ContentSnapshot;
  /** Edit fields of an existing content item. */
  change(op: EditOp): ContentSnapshot;
}

/**
 * The post-commit lifecycle callbacks (REQ-006), supplied as individual props on
 * {@link EditingProvider}/`AdminProvider`. Fired AFTER state/store update, never
 * during render (NFR-006). Skeleton: declared and threaded; the real
 * once-per-action post-commit emitter is DASH-T-0004.
 */
export interface EditingCallbacks {
  /** After selection changes. */
  readonly onSelect?: (ref: EditingRef | null) => void;
  /** When an editing session opens. */
  readonly onEditingStart?: (ref: EditingRef) => void;
  /** When an editing session closes. */
  readonly onEditingStop?: (ref: EditingRef) => void;
  /** After an `insert` op applies. */
  readonly onInsert?: (op: InsertOp) => void;
  /** After a `delete` op applies. */
  readonly onRemove?: (op: DeleteOp) => void;
  /** After a `move` op applies. */
  readonly onMove?: (op: MoveOp) => void;
  /** After ANY content-mutating op applies, with the fresh snapshot. */
  readonly onContentChange?: (snapshot: ContentSnapshot) => void;
}
