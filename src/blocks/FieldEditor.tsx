/**
 * DASH-T-0031 — `<FieldEditor>`, the standalone field-editing core of the
 * composable panels (DASH-I-0003).
 *
 * Extracted from `SidePanel` (whose `renderField`/generic-textarea logic this
 * mirrors verbatim): given a resolved block type + the selected `CmsContent`, it
 * renders the block's `renderField(content, onEdit)` when present, else the
 * generic labelled textarea bound to `content.value`. Edits route through the
 * DASH-I-0001 controller `change` action (an `EditOp`) by default, or through an
 * injected `onChange` prop (standalone/testing) — never a direct store `apply`
 * in the panel (the controller is the single mutation entry point).
 *
 * The edit/style panels (DASH-T-0032/0036) and the re-implemented `SidePanel`
 * (DASH-T-0034) compose this.
 */

import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { useEditingActions } from "../editing";
import type { BlockFieldPatch, BlockType } from "./BlockType.js";

/** Merge a base class with an optional consumer class. */
function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

export interface FieldEditorProps {
  /**
   * The resolved block type for `content.type`. When it has a `renderField`, that
   * editor is used; otherwise (or when the type is unknown → `undefined`) the
   * generic textarea is rendered.
   */
  block?: BlockType;
  /** The selected content item being edited. */
  content: CmsContent;
  /** The target the item lives in — needed to build the `EditOp` for the default
   * controller path. */
  targetId: string;
  /**
   * Override the edit sink (standalone/testing). When provided it receives the
   * patch instead of the controller `change` action; when omitted, edits route to
   * `useEditingActions().change`.
   */
  onChange?: (patch: BlockFieldPatch) => void;
  className?: string;
  style?: CSSProperties;
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
 * Render a block's field editor (or the generic fallback), routing edits to the
 * controller or an injected `onChange`.
 */
export function FieldEditor({
  block,
  content,
  targetId,
  onChange,
  className,
  style,
}: FieldEditorProps): ReactNode {
  const actions = useEditingActions();

  const onEdit = (patch: BlockFieldPatch): void => {
    if (onChange) {
      onChange(patch);
      return;
    }
    actions.change({ kind: "edit", targetId, contentId: content.id, patch });
  };

  return (
    <div
      className={joinClasses("sd-field-editor", className)}
      {...(style ? { style } : {})}
    >
      {block?.renderField
        ? block.renderField(content, onEdit)
        : <DefaultField content={content} onEdit={onEdit} />}
    </div>
  );
}
