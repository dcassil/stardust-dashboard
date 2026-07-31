/**
 * `@stardust-cms/dashboard` host-shell barrel (SIFR-T-0033).
 *
 * Re-exports the configurable {@link HostShell} composition, its prop/slot types,
 * the {@link useHostSelection} hook, the bundled {@link ConnectionStatus} default
 * status strip, and the config defaults that formerly lived in the demo's
 * `config.ts`. The composition is split across sibling modules (`HostShell.js`,
 * `HostShellCanvas.js`, `hostShellTypes.js`, `HostSelectionContext.js`, …) for
 * size; this barrel is the public entry that unifies them, keeping the package
 * API byte-for-byte unchanged.
 */

export { HostShell } from "./HostShell.js";
export { useHostSelection } from "./HostSelectionContext.js";
export {
  DEFAULT_IFRAME_ORIGIN,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_DESIGN_HEIGHT,
} from "./hostShellTypes.js";
export type {
  HostShellProps,
  HostShellLayoutParts,
  OverlayChromeParts,
  HostSelection,
} from "./hostShellTypes.js";

export { ConnectionStatus } from "./ConnectionStatus.js";
export type { ConnectionStatusProps } from "./ConnectionStatus.js";
