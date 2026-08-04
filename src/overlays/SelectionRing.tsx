/**
 * DASH-T-0024 — `<SelectionRing>`, the standalone hover/selected ring for one
 * mapped content item (DASH-I-0002 REQ-002).
 *
 * It reads the current item from {@link ContentOverlayContext} when rendered as
 * a compound sub-part, or falls back to explicit `ref`/`geometry` props when
 * used standalone. Geometry is consumed AS-IS from the already-host-mapped
 * `MappedGeometry` (NFR-004): no scale multiplication, no mapping import.
 *
 * Positioning follows the compound convention: inside `<ContentOverlay>` the
 * per-child region is already positioned at the item geometry (DASH-T-0023), so
 * the ring simply FILLS that box; passed an explicit `geometry` prop (standalone,
 * no positioned parent) it positions itself absolutely at that geometry.
 */

import type { CSSProperties, ReactNode } from "react";
import type { MappedGeometry } from "@stardust-cms/iframe-adapter/host";
import type { EditingRef } from "../editing";
import { useEditingActions, useSelection } from "../editing";
import { useContentOverlayContext } from "./contentOverlayContext.js";

/** Merge default/selected classes with an optional consumer class. */
function joinClasses(selected: boolean, extra: string | undefined): string {
  const base = selected
    ? "sd-selection-ring sd-selection-ring--selected ov-item ov-item--selected"
    : "sd-selection-ring ov-item";
  return extra ? `${base} ${extra}` : base;
}

/**
 * Absolute box straight from mapped geometry — reads only the already-mapped
 * `top`/`left`/`width`/`height` values (NFR-004). Used only for the standalone
 * (explicit-geometry) case; in-context the ring fills its positioned parent.
 */
function positionFromGeometry(geometry: MappedGeometry): CSSProperties {
  return {
    position: "absolute",
    top: geometry.top,
    left: geometry.left,
    width: geometry.width,
    height: geometry.height,
  };
}

/** Fill the positioned item region provided by {@link ContentOverlay}. */
const FILL_PARENT: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export interface SelectionRingProps {
  /**
   * The item this ring represents when used standalone. Named `itemRef` (not
   * `ref`) so it is a real prop — React reserves `ref`. Omit inside a
   * `<ContentOverlay>`; the ring reads the item from context.
   */
  itemRef?: EditingRef;
  geometry?: MappedGeometry;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

/**
 * A keyboard-operable selection ring for a mapped content item.
 */
export function SelectionRing({
  itemRef: explicitRef,
  geometry: explicitGeometry,
  className,
  style,
  onClick,
}: SelectionRingProps): ReactNode {
  const ctx = useContentOverlayContext();
  const selection = useSelection();
  const actions = useEditingActions();
  const ref = explicitRef ?? ctx?.ref;

  // No item to represent (rendered outside a ContentOverlay with no explicit
  // ref) → render nothing rather than a detached ring.
  if (ref === undefined) {
    return null;
  }

  const selected =
    selection.selectedTargetId === ref.targetId &&
    selection.selectedContentId === ref.contentId;
  // Explicit geometry (standalone) self-positions; otherwise fill the item box.
  const positionStyle = explicitGeometry
    ? positionFromGeometry(explicitGeometry)
    : FILL_PARENT;
  const buttonStyle = style ? { ...positionStyle, ...style } : positionStyle;

  return (
    <button
      type="button"
      className={joinClasses(selected, className)}
      style={buttonStyle}
      aria-pressed={selected}
      aria-label="Select block"
      onClick={
        onClick ??
        (() => {
          actions.select(ref);
        })
      }
    />
  );
}
