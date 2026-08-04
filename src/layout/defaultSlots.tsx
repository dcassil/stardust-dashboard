/**
 * Default overlay chrome for {@link HostShell} — used when a consumer supplies no
 * `renderOverlayChrome`. Extracted from `HostShell.tsx` so the component modules
 * stay under the size limit. Not part of the public API.
 *
 * There is NO default `renderLayout` since DASH-T-0020 (Option B): when
 * `renderLayout` is omitted, `HostShell` renders the turnkey `AdminShell` region
 * substrate — the single layout path — rather than a bespoke grid.
 */

import type { ReactNode } from "react";
import { Overlays } from "../overlays";
import type { OverlayChromeParts } from "./hostShellTypes.js";

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
