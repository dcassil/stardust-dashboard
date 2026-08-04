/**
 * DASH-T-0026 — `<RemoveButton>`, the default delete action primitive.
 *
 * Reads the current item from {@link ContentOverlayContext} when rendered inside
 * `<ContentOverlay.Actions>`, or falls back to an explicit `itemRef` prop when
 * used standalone. Deletes route only through the DASH-I-0001 editing
 * controller, never directly to a store.
 */

import type { CSSProperties, ReactNode } from "react";
import type { EditingRef } from "../editing";
import { useEditingActions } from "../editing";
import { useContentOverlayContext } from "./contentOverlayContext.js";

/** Merge the stable style hook with an optional consumer class. */
function joinClasses(extra: string | undefined): string {
  return extra ? `sd-remove-button ${extra}` : "sd-remove-button";
}

export interface RemoveButtonProps {
  /** The item to delete when used standalone; omit inside `<ContentOverlay>`. */
  itemRef?: EditingRef;
  /** Render disabled but present when editing is unavailable. @default true */
  editable?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface RemoveButtonViewProps {
  targetId: string;
  contentId: string;
  editable: boolean;
  className?: string;
  style?: CSSProperties;
}

function RemoveButtonView({
  targetId,
  contentId,
  editable,
  className,
  style,
}: RemoveButtonViewProps): ReactNode {
  const actions = useEditingActions();

  return (
    <button
      type="button"
      className={joinClasses(className)}
      title="Delete block"
      aria-label="Delete block"
      disabled={!editable}
      onClick={() => {
        actions.remove({ kind: "delete", targetId, contentId });
      }}
      {...(style ? { style } : {})}
    />
  );
}

/**
 * A button that deletes one mapped content item when it has a concrete id.
 */
export function RemoveButton({
  itemRef: explicitRef,
  editable = true,
  className,
  style,
}: RemoveButtonProps): ReactNode {
  const ctx = useContentOverlayContext();
  const itemRef = explicitRef ?? ctx?.ref;

  // Nothing to delete: no resolvable item, or a target-level ref (null content).
  if (itemRef === undefined) {
    return null;
  }
  if (itemRef.contentId === null) {
    return null;
  }

  return (
    <RemoveButtonView
      targetId={itemRef.targetId}
      contentId={itemRef.contentId}
      editable={editable}
      {...(className ? { className } : {})}
      {...(style ? { style } : {})}
    />
  );
}
