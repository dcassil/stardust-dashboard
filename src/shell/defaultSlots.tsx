/**
 * Default render-prop slots for {@link HostShell} — the overlay chrome and layout
 * used when a consumer supplies neither. Extracted from `HostShell.tsx` so the
 * component modules stay under the size limit. Not part of the public API.
 */

import type { ReactNode } from "react";
import { Overlays } from "../overlays";
import type { HostShellLayoutParts, OverlayChromeParts } from "./hostShellTypes.js";

/**
 * Default overlay chrome: the bundled {@link Overlays} wrapping the published
 * primitives with the `ov-*` classes + the store-wired delete button. Selection
 * is threaded so the selected ring reflects the shell-tracked selection.
 */
export function defaultRenderOverlayChrome({
  targets,
  callbacks,
  selectedTargetId,
  selectedContentId,
  editable,
}: OverlayChromeParts): ReactNode {
  return (
    <Overlays
      targets={targets}
      callbacks={callbacks}
      selectedTargetId={selectedTargetId}
      selectedContentId={selectedContentId}
      editable={editable}
    />
  );
}

export function defaultRenderLayout({
  canvas,
  status,
}: HostShellLayoutParts): ReactNode {
  return (
    <div className="admin-layout">
      <div className="admin-main">
        {status}
        {canvas}
      </div>
    </div>
  );
}
