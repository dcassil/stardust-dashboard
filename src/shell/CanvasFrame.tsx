/**
 * The scaled iframe canvas + overlay layer JSX for {@link HostShellCanvas}.
 * Extracted from `HostShell.tsx` so the canvas module's render stays under the
 * per-function line limit. Not part of the public API.
 */

import type { ReactNode, RefObject } from "react";
import type { ConnectionState } from "@stardust-cms/iframe-adapter/host";

export interface CanvasFrameProps {
  iframeRef: RefObject<HTMLIFrameElement>;
  iframeSrc: string;
  designWidth: number;
  designHeight: number;
  scale: number;
  connectionState: ConnectionState;
  overlayChrome: ReactNode;
  children: ReactNode;
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
}: CanvasFrameProps): ReactNode {
  const scaledHeight = designHeight * scale;
  return (
    <div className="admin-canvas-scroll">
      <div
        className="admin-canvas"
        style={{ height: scaledHeight }}
        data-connection-state={connectionState}
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
            `scale`, so no further transform is needed here. */}
        <div className="admin-overlay-layer">
          {overlayChrome}
          {children}
        </div>
      </div>
    </div>
  );
}
