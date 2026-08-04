/**
 * DASH-T-0015 — `Shell.OverlayLayer`, the composable overlay region.
 *
 * The default mount point for the DASH-I-0002 content overlay (`children`),
 * layered over the scaled canvas. It preserves the shipped `.admin-overlay-layer`
 * stacking/pointer-events semantics (absolutely positioned over the relative
 * `.admin-canvas` box it is mounted inside — see `Shell.IframeArea`) and emits
 * the `sd-overlay-layer` hook.
 *
 * Reads ONLY `useOverlayState().mode` (narrow subscription, NFR-006): in
 * `preview` it SUPPRESSES the editing chrome entirely (renders nothing),
 * matching the shipped 0.1.6 dog-ear behaviour — now sourced from the shared
 * overlay state (frozen decision #2, REQ-006) rather than local canvas state.
 *
 * BOUNDARY: imports only React + the `admin` public barrel + `./layout` siblings.
 */

import type { CSSProperties, ReactNode } from "react";
import { useOverlayState } from "../admin";
import { joinClasses } from "./classNames.js";
import { SD_OVERLAY_LAYER } from "./layoutTypes.js";
import type { RegionProps } from "./layoutTypes.js";

/** Props for {@link OverlayLayer}: base region props (`className`/`style`/children). */
export type OverlayLayerProps = RegionProps;

export function OverlayLayer({
  className,
  style,
  children,
}: OverlayLayerProps): ReactNode {
  const { mode } = useOverlayState();
  // Preview is view-only: suppress the editing chrome entirely (parity with the
  // legacy canvas passing `overlayChrome = null`).
  if (mode === "preview") {
    return null;
  }
  const layerStyle: CSSProperties | undefined = style;
  return (
    <div
      className={joinClasses("admin-overlay-layer", SD_OVERLAY_LAYER, className)}
      {...(layerStyle ? { style: layerStyle } : {})}
    >
      {children}
    </div>
  );
}
