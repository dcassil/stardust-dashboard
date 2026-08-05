/**
 * DASH-T-0034 — `SidePanelContent`, the store-routed selection-content view.
 *
 * Extracted verbatim from the original `SidePanel` body (SIFR-T-0034): given an
 * EXPLICIT selection, it resolves the item in the snapshot, looks its `type` up
 * in the registry, and renders that block's `renderField(content, onEdit)` (or a
 * generic textarea fallback). Edits route through the store as `edit` ops via
 * `useContentStore().apply`.
 *
 * DASH-T-0034 keeps this path STORE-routed (not the DASH-I-0001 controller) so
 * the bundled `SidePanel`'s frozen contract test — which mounts it under
 * `StoreProvider` ONLY and asserts synchronous store ops — stays green
 * byte-for-byte. The controller-routed field editor is the standalone
 * `<FieldEditor>` (DASH-T-0031); migrating the bundled panel onto it would change
 * the provider requirement (needs `AdminProvider`), a breaking change deferred to
 * a future major (mirrors the DASH-T-0028 decision for `Overlays`).
 */

import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { useContentStore } from "../store";
import type { ContentSnapshot } from "../store";
import type { BlockFieldPatch, BlockTypeRegistry } from "./BlockType.js";
import { findBlockType } from "./BlockType.js";
import { SD_SIDE_PANEL } from "./panelTypes.js";

/** Merge a base class with an optional consumer class. */
function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

export interface SidePanelContentProps {
  blockTypes: BlockTypeRegistry;
  snapshot?: ContentSnapshot;
  selectedTargetId: string | null;
  selectedContentId: string | null;
  className?: string;
  style?: CSSProperties;
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
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
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
 * The store-routed selection-content view. Given an explicit selection, renders
 * the resolved block's field editor and wires edits to `store.apply` as `edit`
 * ops. Emits `sd-side-panel` (+ the legacy `panel` class).
 */
export function SidePanelContent({
  blockTypes,
  snapshot,
  selectedTargetId,
  selectedContentId,
  className,
  style,
}: SidePanelContentProps): ReactNode {
  const { snapshot: liveSnapshot, apply } = useContentStore();
  const effectiveSnapshot = snapshot ?? liveSnapshot;

  const selected = findSelected(
    effectiveSnapshot,
    selectedTargetId,
    selectedContentId,
  );

  const sectionClass = joinClasses(`${SD_SIDE_PANEL} panel`, className);

  if (!selected) {
    return (
      <section className={sectionClass} {...(style ? { style } : {})}>
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
    <section
      className={sectionClass}
      data-selected-id={content.id}
      {...(style ? { style } : {})}
    >
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
