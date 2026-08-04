/**
 * DASH-T-0015 — `Shell.IframeArea`, the scaled-canvas region.
 *
 * Wraps the shared scaled-canvas mechanics ({@link ScaledCanvas} + the
 * {@link useCanvas} engine) as a composable region: it consumes the mapped
 * geometry (`effectiveScale`, connection state) from the engine — it NEVER owns
 * geometry (initiative Non-Goal) — and renders the scaled iframe. Its `children`
 * (a `Shell.OverlayLayer`) are mounted inside the relative canvas box so the
 * overlay shares the iframe's top-left origin. Emits the `sd-iframe-area` hook.
 *
 * BOUNDARY: composes the shell canvas mechanics via the legal `layout → shell`
 * edge (through the `shell` public barrel), never a store/geometry internal.
 */

import type { ReactNode } from "react";
import { ScaledCanvas, useCanvas } from "../shell";
import { joinClasses } from "./classNames.js";
import { SD_IFRAME_AREA } from "./layoutTypes.js";
import type { RegionProps } from "./layoutTypes.js";

/** Props for {@link IframeArea}: base region props (`className`/`style`/children). */
export type IframeAreaProps = RegionProps;

export function IframeArea({
  className,
  style,
  children,
}: IframeAreaProps): ReactNode {
  const canvas = useCanvas();
  return (
    <ScaledCanvas
      className={joinClasses(SD_IFRAME_AREA, className)}
      {...(style ? { style } : {})}
      iframeRef={canvas.iframeRef}
      iframeSrc={canvas.iframeSrc}
      designWidth={canvas.designWidth}
      designHeight={canvas.designHeight}
      scale={canvas.effectiveScale}
      connectionState={canvas.connectionState}
      previewable={canvas.previewable}
      preview={canvas.preview}
      onTogglePreview={canvas.togglePreview}
    >
      {children}
    </ScaledCanvas>
  );
}
