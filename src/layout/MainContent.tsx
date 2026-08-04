/**
 * DASH-T-0015 — `Shell.MainContent`, the primary content region.
 *
 * Composes {@link IframeArea} (the scaled canvas) with {@link OverlayLayer} (the
 * DASH-I-0002 overlay, layered over it via `children`) and exposes the surgical
 * main-area slots (REQ-004/REQ-010), each resolved through {@link resolveSlot}
 * with its documented contract:
 *  - `page-header` — rendered above the canvas (`{ selectedTargetId, selectedContentId }`).
 *  - `content-wrapper` — wraps the canvas (`{ children }`).
 *  - `loading` — rendered while the connection is not ready.
 *  - `empty` — rendered when nothing is selected (`{ reason: "no-selection" }`).
 *
 * Emits the `main` landmark (NFR-003) + the `sd-main-content` hook. Reads
 * `useSelection()` (empty/page-header) and the engine's connection state
 * (loading) — narrow subscriptions (NFR-006).
 *
 * BOUNDARY: React + `editing` barrel + shell canvas mechanics (via `../shell`) +
 * `./layout` siblings — never a store/geometry internal.
 */

import type { CSSProperties, ReactNode } from "react";
import { useSelection } from "../editing";
import { useCanvas } from "../shell";
import { joinClasses } from "./classNames.js";
import { IframeArea } from "./IframeArea.js";
import { OverlayLayer } from "./OverlayLayer.js";
import { resolveSlot } from "./slots.js";
import { SD_MAIN_CONTENT } from "./layoutTypes.js";
import type { RegionProps, ShellSlots } from "./layoutTypes.js";

/** Props for {@link MainContent}: region props + the main-area slot overrides. */
export interface MainContentProps extends RegionProps {
  /** Consumer overrides for `page-header`/`content-wrapper`/`empty`/`loading`. */
  readonly slots?: Partial<ShellSlots>;
}

export function MainContent({
  className,
  style,
  children,
  slots,
}: MainContentProps): ReactNode {
  const { connectionState } = useCanvas();
  const { selectedTargetId, selectedContentId } = useSelection();
  const loading = connectionState !== "connected";
  const empty = selectedTargetId === null && selectedContentId === null;

  const canvas = (
    <IframeArea>
      <OverlayLayer>{children}</OverlayLayer>
    </IframeArea>
  );

  const rootStyle: CSSProperties | undefined = style;
  return (
    <main
      className={joinClasses(SD_MAIN_CONTENT, className)}
      {...(rootStyle ? { style: rootStyle } : {})}
    >
      {resolveSlot("page-header", slots, { selectedTargetId, selectedContentId })}
      {loading ? resolveSlot("loading", slots, {}) : null}
      {empty ? resolveSlot("empty", slots, { reason: "no-selection" }) : null}
      {resolveSlot("content-wrapper", slots, { children: canvas })}
    </main>
  );
}
