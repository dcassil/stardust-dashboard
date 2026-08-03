/**
 * `PreviewToggle` — the dog-ear corner control layered over the scaled iframe
 * canvas (top-right, on the admin overlay). Clicking it toggles the shell's
 * preview mode: hide the editor sidebar, render the embedded site at native
 * 100% scale, and disable the edit overlays. Clicking again restores editing.
 *
 * It is package-owned chrome (rendered by {@link CanvasFrame}, NOT a consumer
 * render-prop) and fully INLINE-STYLED so the affordance works in any consumer
 * with no extra stylesheet — a version bump is enough. The folded-corner
 * triangle reads as "peel the page open"; the glyph points outward to expand
 * when editing and inward to collapse when previewing.
 */

import type { ReactNode } from "react";

export interface PreviewToggleProps {
  /** Whether preview mode is currently active (drives glyph + color + label). */
  preview: boolean;
  /** Toggle preview on/off. */
  onToggle: () => void;
}

/** Edge length (px) of the square corner the dog-ear occupies. */
const SIZE = 46;

export function PreviewToggle({
  preview,
  onToggle,
}: PreviewToggleProps): ReactNode {
  const label = preview
    ? "Exit preview and show the editor sidebar"
    : "Preview: hide the sidebar and view the page at 100%";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={preview}
      aria-label={label}
      title={preview ? "Exit preview" : "Preview (hide sidebar, 100%)"}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: SIZE,
        height: SIZE,
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        lineHeight: 0,
        zIndex: 30,
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox="0 0 46 46" aria-hidden="true">
        {/* Folded-corner triangle (the "dog ear"). */}
        <path
          d="M46 0 L46 46 L0 0 Z"
          fill={preview ? "#4f46e5" : "rgba(17,24,39,0.82)"}
        />
        {/* Diagonal fold crease for a bit of depth. */}
        <path d="M0 0 L46 46" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        {preview ? (
          // Collapse: arrowhead pointing inward (toward the corner).
          <g
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <path d="M28 12 l0 6 l6 0" />
            <path d="M28 18 l10 -10" />
          </g>
        ) : (
          // Expand: arrowhead pointing outward (toward the corner).
          <g
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <path d="M38 8 l0 6 M38 8 l-6 0" />
            <path d="M38 8 l-11 11" />
          </g>
        )}
      </svg>
    </button>
  );
}
