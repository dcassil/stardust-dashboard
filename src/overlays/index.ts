/**
 * `@stardust-cms/dashboard` overlays barrel (SIFR-T-0035).
 *
 * Re-exports the overridable {@link Overlays} chrome that wraps the published
 * unstyled overlay primitives, plus its prop/slot types and the default `ov-*`
 * class-name constants (so consumers can extend rather than replace the defaults).
 * The `Overlays` component lives in `./Overlays.js`; its class defaults and
 * prop/render types live in `./overlaysTypes.js` — this barrel is the public
 * entry that unifies them, keeping the package API byte-for-byte unchanged.
 */

export { Overlays } from "./Overlays.js";
export {
  DEFAULT_TARGET_CLASS_NAME,
  DEFAULT_SELECTED_TARGET_CLASS_NAME,
  DEFAULT_CONTAINER_TARGET_CLASS_NAME,
  DEFAULT_TARGET_ITEM_CLASS_NAME,
  DEFAULT_ITEM_CLASS_NAME,
  DEFAULT_SELECTED_ITEM_CLASS_NAME,
  DEFAULT_GROUP_CLASS_NAME,
  DEFAULT_DELETE_CLASS_NAME,
  SD_CONTENT_OVERLAY,
  SD_CONTENT_OVERLAY_ITEM,
  SD_SELECTION_RING,
  SD_ACTIONS,
} from "./overlaysTypes.js";
export type {
  OverlaysProps,
  ItemChromeActions,
  RenderItemChrome,
} from "./overlaysTypes.js";

// DASH-T-0023 — composable compound overlay root + its typed context. Static
// parts (`.SelectionRing`/`.Actions`) and the action primitives land in
// DASH-T-0024…0027; root re-export (src/index.ts) + JSDoc is DASH-T-0030.
export { ContentOverlay } from "./ContentOverlay.js";
export type { ContentOverlayProps } from "./ContentOverlay.js";
export { useContentOverlayContext } from "./contentOverlayContext.js";
export type { ContentOverlayContextValue } from "./contentOverlayContext.js";

// DASH-T-0024 / DASH-T-0025 — the compound parts, also usable standalone.
export { SelectionRing } from "./SelectionRing.js";
export type { SelectionRingProps } from "./SelectionRing.js";
export { ContentOverlayActions } from "./Actions.js";
export type { ContentOverlayActionsProps } from "./Actions.js";
