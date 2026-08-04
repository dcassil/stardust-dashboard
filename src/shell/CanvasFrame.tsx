/**
 * The scaled iframe canvas + the bundled `.admin-overlay-layer` for
 * {@link HostShellCanvas} (the LEGACY render-prop composition). Since DASH-T-0015
 * the scaled-canvas markup lives in {@link ScaledCanvas}; `CanvasFrame` is the
 * thin wrapper that supplies the bundled overlay layer (chrome + children) as
 * that canvas's child — keeping the pre-extraction DOM byte-for-byte. The
 * composable `Shell.IframeArea`/`Shell.OverlayLayer` regions render the same
 * `ScaledCanvas` with a composable overlay layer instead. Not part of the public
 * API.
 */

import type { ReactNode, RefObject } from "react";
import type { ConnectionState } from "@stardust-cms/iframe-adapter/host";
import { ScaledCanvas } from "./ScaledCanvas.js";

export interface CanvasFrameProps {
  iframeRef: RefObject<HTMLIFrameElement>;
  iframeSrc: string;
  designWidth: number;
  designHeight: number;
  scale: number;
  connectionState: ConnectionState;
  overlayChrome: ReactNode;
  children: ReactNode;
  /** Whether the dog-ear preview control is offered at all. */
  previewable: boolean;
  /** Whether preview mode is currently active (drives the dog-ear glyph). */
  preview: boolean;
  /** Toggle preview mode; wired to the dog-ear control. */
  onTogglePreview: () => void;
}

export function CanvasFrame({
  iframeRef,
  iframeSrc,
  designWidth,
  designHeight,
  scale,
  connectionState,
  overlayChrome,
  children,
  previewable,
  preview,
  onTogglePreview,
}: CanvasFrameProps): ReactNode {
  return (
    <ScaledCanvas
      iframeRef={iframeRef}
      iframeSrc={iframeSrc}
      designWidth={designWidth}
      designHeight={designHeight}
      scale={scale}
      connectionState={connectionState}
      previewable={previewable}
      preview={preview}
      onTogglePreview={onTogglePreview}
    >
      {/* Overlay layer: absolutely positioned over the scaled canvas, sharing
          its top-left origin. mapGeometry has already applied `scale`, so no
          further transform is needed here. Suppressed in preview (the caller
          passes `overlayChrome = null`). */}
      <div className="admin-overlay-layer">
        {overlayChrome}
        {children}
      </div>
    </ScaledCanvas>
  );
}
