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
} from "./overlaysTypes.js";
export type {
  OverlaysProps,
  ItemChromeActions,
  RenderItemChrome,
} from "./overlaysTypes.js";
