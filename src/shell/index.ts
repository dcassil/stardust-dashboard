/**
 * `@stardust-cms/dashboard` host-shell barrel (SIFR-T-0033).
 *
 * Re-exports the configurable {@link HostShell} composition, its prop/slot types,
 * the bundled {@link ConnectionStatus} default status strip, and the config
 * defaults that formerly lived in the demo's `config.ts`.
 */

export {
  HostShell,
  DEFAULT_IFRAME_ORIGIN,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_DESIGN_HEIGHT,
} from "./HostShell.js";
export type {
  HostShellProps,
  HostShellLayoutParts,
  OverlayChromeParts,
} from "./HostShell.js";

export { ConnectionStatus } from "./ConnectionStatus.js";
export type { ConnectionStatusProps } from "./ConnectionStatus.js";
