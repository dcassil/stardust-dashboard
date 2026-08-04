/**
 * `ScaledCanvas` — the scaled-iframe canvas box. The DASH-I-0005
 * `Shell.IframeArea` region wraps it with a composable `Shell.OverlayLayer` child
 * to render the `.admin-canvas-scroll > .admin-canvas > iframe` markup + dog-ear.
 * (Before DASH-T-0020 a legacy `CanvasFrame` wrapper shared this same box; that
 * render-prop path was deleted, and `Shell.IframeArea` is now the sole caller —
 * the DOM is unchanged.)
 *
 * It renders ONLY structure: the outer scroll box, the relatively-positioned
 * canvas box (so an absolutely-positioned overlay child shares its origin), the
 * scaled iframe, `children` (the overlay layer), and the package-owned dog-ear.
 * Geometry (`scale`) arrives already-computed from the caller/engine — this
 * component never owns it. Part of the shell's canvas-mechanics reuse surface
 * (barrel-exported so the `layout` structure layer composes it).
 */

import type { CSSProperties, ReactNode, RefObject } from "react";
import type { ConnectionState } from "@stardust-cms/iframe-adapter/host";
import { PreviewToggle } from "./PreviewToggle.js";

export interface ScaledCanvasProps {
  iframeRef: RefObject<HTMLIFrameElement>;
  iframeSrc: string;
  designWidth: number;
  designHeight: number;
  scale: number;
  connectionState: ConnectionState;
  /** Whether the dog-ear preview control is offered at all. */
  previewable: boolean;
  /** Whether preview mode is currently active (drives the dog-ear glyph). */
  preview: boolean;
  /** Toggle preview mode; wired to the dog-ear control. */
  onTogglePreview: () => void;
  /** Extra class on the outer scroll box (e.g. a region's `sd-*` hook). */
  className?: string;
  /** Extra style on the outer scroll box. */
  style?: CSSProperties;
  /** Rendered inside the relative canvas box, over the iframe (the overlay layer). */
  children?: ReactNode;
}

export function ScaledCanvas({
  iframeRef,
  iframeSrc,
  designWidth,
  designHeight,
  scale,
  connectionState,
  previewable,
  preview,
  onTogglePreview,
  className,
  style,
  children,
}: ScaledCanvasProps): ReactNode {
  const scaledHeight = designHeight * scale;
  const scrollClass = className
    ? `admin-canvas-scroll ${className}`
    : "admin-canvas-scroll";
  return (
    <div className={scrollClass} style={style}>
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
        {children}
        {/* Package-owned dog-ear control, on the admin overlay, top-right. */}
        {previewable && (
          <PreviewToggle preview={preview} onToggle={onTogglePreview} />
        )}
      </div>
    </div>
  );
}
