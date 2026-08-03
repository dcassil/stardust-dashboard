/**
 * The scaled iframe canvas + overlay layer JSX for {@link HostShellCanvas}.
 * Extracted from `HostShell.tsx` so the canvas module's render stays under the
 * per-function line limit. Not part of the public API.
 */

import type { ReactNode, RefObject } from "react";
import type { ConnectionState } from "@stardust-cms/iframe-adapter/host";
import { PreviewToggle } from "./PreviewToggle.js";

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
  const scaledHeight = designHeight * scale;
  return (
    <div className="admin-canvas-scroll">
      <div
        className="admin-canvas"
        // `position: relative` guarantees the overlay layer + dog-ear are
        // positioned against the canvas box regardless of consumer CSS.
        style={{ height: scaledHeight, position: "relative" }}
        data-connection-state={connectionState}
        data-preview={preview ? "" : undefined}
      >
        <iframe
          ref={iframeRef}
          className="admin-canvas__iframe"
          title="Embedded site preview"
          src={iframeSrc}
          style={{
            width: designWidth,
            height: designHeight,
            transform: `scale(${String(scale)})`,
            transformOrigin: "top left",
          }}
        />
        {/* Overlay layer: absolutely positioned over the scaled canvas,
            sharing its top-left origin. mapGeometry has already applied
            `scale`, so no further transform is needed here. Suppressed in
            preview (the caller passes `overlayChrome = null`). */}
        <div className="admin-overlay-layer">
          {overlayChrome}
          {children}
        </div>
        {/* Package-owned dog-ear control, on the admin overlay, top-right. */}
        {previewable && (
          <PreviewToggle preview={preview} onToggle={onTogglePreview} />
        )}
      </div>
    </div>
  );
}
