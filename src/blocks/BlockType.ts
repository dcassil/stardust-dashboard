/**
 * `BlockType` registry (SIFR-I-0007 REQ-004, Detailed Design §4).
 *
 * A `BlockType` describes one kind of content block the editor understands. The
 * registry is the seam that lets a consumer define their own blocks (e.g.
 * `heading`, `richText`, `gallery`) with zero forking (Use Case 2): the
 * {@link Palette} iterates the registry to render draggable sources, and the
 * {@link SidePanel} looks up the selected item's `type` to render its field
 * editor.
 *
 * The demo previously hard-coded `text`/`image` inside `Palette`/`SidePanel` and
 * the shell's `onInsert` default-value switch. All three are now driven by this
 * registry instead — the shell package ships no built-in block types (the demo
 * supplies its own `text`/`image` registry).
 *
 * INVARIANT (NFR-003): strict TS, no `any`. The field-edit patch shape is aligned
 * with the store's {@link EditOp} `patch` so a `renderField` editor's `onEdit`
 * flows straight into `store.apply({ kind: "edit", ..., patch })`.
 */

import type { ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import type { EditOp } from "../store/adapter.js";

/**
 * The patch a {@link BlockType.renderField} editor emits. Identical to the
 * store's {@link EditOp} `patch` so an editor's `onEdit(patch)` can be forwarded
 * verbatim into an `edit` op — the registry drives editing, not just display.
 */
export type BlockFieldPatch = EditOp["patch"];

/**
 * One kind of content block the editor understands.
 *
 * @typeParam TType - the block's discriminant string; defaults to `string` so a
 *   heterogeneous `BlockType[]` registry is well-typed, while a single definition
 *   can narrow to a literal (e.g. `BlockType<"heading">`).
 */
export interface BlockType<TType extends string = string> {
  /** The block-type discriminant. Matches `CmsContent.type` / `InsertOp` payload `type`. */
  type: TType;
  /** Human-readable label shown in the palette. */
  label: string;
  /**
   * The default value for a freshly inserted block of this type. Returned either
   * as a bare `CmsContent["value"]` (the common case — a string) or as a partial
   * `CmsContent` when a block needs to seed more than `value` (e.g. `column` for a
   * container). The shell's `onInsert` merges the result into the insert payload.
   * Absent → the block inserts with no seeded fields.
   */
  defaultValue?(): CmsContent["value"] | Partial<CmsContent>;
  /**
   * Render the side-panel field editor for a selected item of this type. Receives
   * the current {@link CmsContent} and an `onEdit` that takes a
   * {@link BlockFieldPatch}. Absent → the {@link SidePanel} renders a generic text
   * field bound to `content.value`.
   */
  renderField?(
    content: CmsContent,
    onEdit: (patch: BlockFieldPatch) => void,
  ): ReactNode;
}

/**
 * A registry of block types. Ordered (the palette renders in this order); an
 * empty registry is valid (the shell defaults to it when `blockTypes` is omitted).
 */
export type BlockTypeRegistry = readonly BlockType[];

/**
 * Look up a block type by its `type` discriminant. Returns `undefined` when no
 * block type matches — call sites render a graceful fallback rather than crash
 * (unknown-type resilience, TC-002).
 */
export function findBlockType(
  blockTypes: BlockTypeRegistry,
  type: string,
): BlockType | undefined {
  return blockTypes.find((b) => b.type === type);
}
