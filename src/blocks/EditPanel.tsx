/**
 * DASH-T-0032 — session-scoped edit panel.
 *
 * Reads the active editing session, resolves it against the content snapshot,
 * and composes `FieldEditor` so edits continue to route through the controller.
 */

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useEditingState } from "../editing";
import type { EditingRef } from "../editing";
import { useContentStore } from "../store";
import type { ContentSnapshot } from "../store";
import type { BlockTypeRegistry } from "./BlockType.js";
import { findBlockType } from "./BlockType.js";
import { FieldEditor } from "./FieldEditor.js";

export interface EditPanelProps {
  blockTypes: BlockTypeRegistry;
  /** Override the edited item (standalone/testing). Named `editingRef` (not
   * `ref`, which React reserves); defaults to the session's `editingRef`. */
  editingRef?: EditingRef;
  snapshot?: ContentSnapshot;
  className?: string;
  style?: CSSProperties;
}

function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

function findEditingItem(
  snapshot: ContentSnapshot,
  editingRef: EditingRef,
): ContentSnapshot[number] | undefined {
  if (editingRef.contentId === null) {
    return undefined;
  }
  return snapshot.find(
    (item) =>
      item.targetId === editingRef.targetId &&
      item.content.id === editingRef.contentId,
  );
}

function focusFirstField(container: HTMLElement | null): void {
  if (container === null) {
    return;
  }
  const first = container.querySelector<HTMLElement>(
    "input, textarea, select, [tabindex]",
  );
  if (first !== null) {
    first.focus();
  }
}

export function EditPanel(props: EditPanelProps): ReactNode {
  const { isEditing, editingRef } = useEditingState();
  const { snapshot: liveSnapshot } = useContentStore();
  const containerRef = useRef<HTMLElement | null>(null);
  const wasEditingRef = useRef<boolean>(isEditing);

  useEffect(() => {
    const wasEditing = wasEditingRef.current;
    wasEditingRef.current = isEditing;
    if (!wasEditing && isEditing) {
      focusFirstField(containerRef.current);
    }
  }, [isEditing]);

  const effectiveRef = props.editingRef ?? editingRef;
  const effectiveSnapshot = props.snapshot ?? liveSnapshot;
  const selected = effectiveRef
    ? findEditingItem(effectiveSnapshot, effectiveRef)
    : undefined;
  const className = joinClasses("sd-edit-panel panel", props.className);
  const styleProp = props.style ? { style: props.style } : {};

  // `ref` is applied directly on each <section> (never bundled into a spread
  // object) so the react-hooks/refs rule isn't tripped by a ref read in render.
  if (!isEditing || effectiveRef === null || selected === undefined) {
    return (
      <section ref={containerRef} className={className} {...styleProp}>
        <p className="panel__hint">Click a block in the preview to edit it.</p>
      </section>
    );
  }

  const { content, targetId } = selected;
  const blockType = findBlockType(props.blockTypes, content.type);

  return (
    <section
      ref={containerRef}
      className={className}
      {...styleProp}
      data-selected-id={content.id}
    >
      <FieldEditor
        {...(blockType ? { block: blockType } : {})}
        content={content}
        targetId={targetId}
      />
    </section>
  );
}
