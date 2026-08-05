/**
 * DASH-T-0036 — selection-driven style panel.
 *
 * Resolves the selected block from the editing controller selection and renders
 * either a bespoke `renderStyle` editor or controls from `styleSchema`. Edits
 * route through the controller `change` action unless an `onChange` override is
 * supplied for standalone composition/tests.
 */

import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { useEditingActions, useSelection } from "../editing";
import type { EditingRef } from "../editing";
import { useContentStore } from "../store";
import type { ContentSnapshot } from "../store";
import type {
  BlockFieldPatch,
  BlockTypeRegistry,
  StyleField,
} from "./BlockType.js";
import { findBlockType } from "./BlockType.js";

export interface StylePanelProps {
  blockTypes: BlockTypeRegistry;
  editingRef?: EditingRef;
  snapshot?: ContentSnapshot;
  onChange?: (patch: BlockFieldPatch) => void;
  className?: string;
  style?: CSSProperties;
}

function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

function findStyleItem(
  snapshot: ContentSnapshot,
  ref: EditingRef,
): ContentSnapshot[number] | undefined {
  if (ref.contentId === null) {
    return undefined;
  }
  return snapshot.find(
    (item) =>
      item.targetId === ref.targetId &&
      item.content.id === ref.contentId,
  );
}

function dataFieldValue(content: CmsContent, key: string): string {
  const { data } = content;
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return "";
  }
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function fieldValue(content: CmsContent, key: string): string {
  if (key === "value") {
    return content.value ?? "";
  }
  if (key === "styleGroup") {
    return content.styleGroup ?? "";
  }
  if (key === "column") {
    return content.column === true ? "true" : "false";
  }
  return dataFieldValue(content, key);
}

function patchForField(key: string, value: string): BlockFieldPatch {
  const patch: BlockFieldPatch = {};
  Object.defineProperty(patch, key, { enumerable: true, value });
  return patch;
}

function StyleControl({
  content,
  field,
  onEdit,
}: {
  content: CmsContent;
  field: StyleField;
  onEdit: (patch: BlockFieldPatch) => void;
}): ReactNode {
  const value = fieldValue(content, field.key);
  const handleInput = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    onEdit(patchForField(field.key, event.target.value));
  };

  if (field.kind === "select") {
    return (
      <label className="panel__field">
        <span>{field.label}</span>
        <select value={value} onChange={handleInput}>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="panel__field">
      <span>{field.label}</span>
      <input type={field.kind} value={value} onChange={handleInput} />
    </label>
  );
}

export function StylePanel(props: StylePanelProps): ReactNode {
  const selection = useSelection();
  const actions = useEditingActions();
  const { snapshot: liveSnapshot } = useContentStore();
  const effectiveRef = props.editingRef ?? selection.selectedRef;
  const effectiveSnapshot = props.snapshot ?? liveSnapshot;
  const className = joinClasses("sd-style-panel panel", props.className);
  const styleProp = props.style ? { style: props.style } : {};
  const selected = effectiveRef
    ? findStyleItem(effectiveSnapshot, effectiveRef)
    : undefined;

  if (selected === undefined) {
    return (
      <section className={className} {...styleProp}>
        <p className="panel__hint">Select a block to edit its style.</p>
      </section>
    );
  }

  const { content, targetId } = selected;
  const block = findBlockType(props.blockTypes, content.type);
  const onEdit = (patch: BlockFieldPatch): void => {
    if (props.onChange) {
      props.onChange(patch);
      return;
    }
    actions.change({ kind: "edit", targetId, contentId: content.id, patch });
  };
  const schema = block?.styleSchema ?? [];

  return (
    <section
      className={className}
      {...styleProp}
      data-selected-id={content.id}
    >
      {block?.renderStyle
        ? block.renderStyle(content, onEdit)
        : schema.map((field) => (
            <StyleControl
              key={field.key}
              content={content}
              field={field}
              onEdit={onEdit}
            />
          ))}
    </section>
  );
}
