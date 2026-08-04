/**
 * DASH-T-0026 — `<EditButton>`, the default edit action primitive.
 *
 * Reads the current item from {@link ContentOverlayContext} when rendered inside
 * `<ContentOverlay.Actions>`, or falls back to an explicit `itemRef` prop when
 * used standalone. The default click opens the DASH-I-0001 editing session; a
 * consumer `onClick` replaces that behavior entirely for custom modal flows.
 */

import type { CSSProperties, ReactNode } from "react";
import type { EditingRef } from "../editing";
import { useEditingActions } from "../editing";
import { useContentOverlayContext } from "./contentOverlayContext.js";

/** Merge the stable style hook with an optional consumer class. */
function joinClasses(extra: string | undefined): string {
  return extra ? `sd-edit-button ${extra}` : "sd-edit-button";
}

export interface EditButtonProps {
  /** The item to edit when used standalone; omit inside `<ContentOverlay>`. */
  itemRef?: EditingRef;
  /** Render disabled but present when editing is unavailable. @default true */
  editable?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Replaces the default `startEditing` behavior when supplied. */
  onClick?: () => void;
}

interface EditButtonViewProps {
  itemRef: EditingRef;
  editable: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

function EditButtonView({
  itemRef,
  editable,
  className,
  style,
  onClick,
}: EditButtonViewProps): ReactNode {
  const actions = useEditingActions();
  const handleClick =
    onClick ??
    (() => {
      actions.startEditing(itemRef);
    });

  return (
    <button
      type="button"
      className={joinClasses(className)}
      title="Edit block"
      aria-label="Edit block"
      disabled={!editable}
      onClick={handleClick}
      {...(style ? { style } : {})}
    />
  );
}

/**
 * A button that opens editing for one mapped content item.
 */
export function EditButton({
  itemRef: explicitRef,
  editable = true,
  className,
  style,
  onClick,
}: EditButtonProps): ReactNode {
  const ctx = useContentOverlayContext();
  const itemRef = explicitRef ?? ctx?.ref;

  if (itemRef === undefined) {
    return null;
  }

  return (
    <EditButtonView
      itemRef={itemRef}
      editable={editable}
      {...(className ? { className } : {})}
      {...(style ? { style } : {})}
      {...(onClick ? { onClick } : {})}
    />
  );
}
