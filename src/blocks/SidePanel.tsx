/**
 * Registry-driven content side panel (SIFR-T-0034, REQ-004).
 *
 * The reusable generalization of the demo's `SidePanel` (which switched on
 * `text`/`image` to pick a field editor). Given the current selection
 * (`selectedTargetId` / `selectedContentId`) it finds the selected item in the
 * store snapshot, looks its `type` up in the injected `blockTypes` registry, and
 * renders that block's `renderField(content, onEdit)`. When the block supplies no
 * `renderField` it falls back to a generic text field bound to `content.value`;
 * an unknown type still resolves an item and gets the generic field (graceful
 * fallback, not a crash).
 *
 * Edits route through the store: every `onEdit(patch)` becomes an `edit`
 * {@link EditOp} applied via `useContentStore().apply` — so the registry drives
 * editing, not just display (TC-002). The snapshot + selection are read from the
 * store context by default; they may also be passed explicitly for testing or
 * custom composition.
 */

import type { ChangeEvent, ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { useContentStore } from "../store";
import type { ContentSnapshot } from "../store";
import type { BlockFieldPatch, BlockTypeRegistry } from "./BlockType.js";
import { findBlockType } from "./BlockType.js";

export interface SidePanelProps {
  /** The block-type registry used to resolve the selected item's field editor. */
  blockTypes: BlockTypeRegistry;
  /**
   * The snapshot to resolve the selection against. Defaults to the live snapshot
   * from {@link useContentStore}.
   */
  snapshot?: ContentSnapshot;
  /** The selected target id, or `null` when nothing is selected. */
  selectedTargetId: string | null;
  /** The selected content id, or `null` when nothing is selected. */
  selectedContentId: string | null;
}

/** Find the selected payload in a snapshot, honoring an optional target filter. */
function findSelected(
  snapshot: ContentSnapshot,
  selectedTargetId: string | null,
  selectedContentId: string | null,
): ContentSnapshot[number] | undefined {
  if (selectedContentId === null) {
    return undefined;
  }
  return snapshot.find(
    (p) =>
      p.content.id === selectedContentId &&
      (selectedTargetId === null || p.targetId === selectedTargetId),
  );
}

/** The generic text field used when a block supplies no `renderField`. */
function DefaultField({
  content,
  onEdit,
}: {
  content: CmsContent;
  onEdit: (patch: BlockFieldPatch) => void;
}): ReactNode {
  const handleChange = (
    e: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    onEdit({ value: e.target.value });
  };
  return (
    <label className="panel__field">
      <span>Value</span>
      <textarea
        rows={4}
        value={content.value ?? ""}
        onChange={handleChange}
        data-testid="panel-default-field"
      />
    </label>
  );
}

/**
 * The selection-aware side panel. Resolves the selected item's block type and
 * renders its editor, wiring edits to `store.apply` as `edit` ops.
 */
export function SidePanel({
  blockTypes,
  snapshot,
  selectedTargetId,
  selectedContentId,
}: SidePanelProps): ReactNode {
  const { snapshot: liveSnapshot, apply } = useContentStore();
  const effectiveSnapshot = snapshot ?? liveSnapshot;

  const selected = findSelected(
    effectiveSnapshot,
    selectedTargetId,
    selectedContentId,
  );

  if (!selected) {
    return (
      <section className="panel">
        <h2 className="panel__title">Content</h2>
        <p className="panel__hint">Click a block in the preview to edit it.</p>
      </section>
    );
  }

  const { content, targetId } = selected;
  const blockType = findBlockType(blockTypes, content.type);

  const onEdit = (patch: BlockFieldPatch): void => {
    apply({ kind: "edit", targetId, contentId: content.id, patch });
  };

  return (
    <section className="panel" data-selected-id={content.id}>
      <h2 className="panel__title">Content</h2>
      <dl className="panel__meta">
        <dt>id</dt>
        <dd>{content.id}</dd>
        <dt>type</dt>
        <dd>{content.type}</dd>
        <dt>target</dt>
        <dd>{targetId}</dd>
      </dl>

      {blockType?.renderField
        ? blockType.renderField(content, onEdit)
        : <DefaultField content={content} onEdit={onEdit} />}
    </section>
  );
}
