/**
 * `@stardust-cms/dashboard` layout (structure) barrel.
 *
 * The public entry for the structure layer: the turnkey {@link AdminShell} region
 * substrate and the {@link HostShell} thin-wrapper composition that configures it
 * (SIFR-T-0033 / DASH-I-0005). `HostShell` and its cluster
 * (`hostShellTypes`/`HostSelectionContext`/`ConnectionStatus`/`defaultSlots`)
 * live here since DASH-T-0020 — the package root re-exports `HostShell`,
 * `useHostSelection`, `ConnectionStatus`, and the config defaults from this
 * barrel, keeping the public API byte-for-byte unchanged.
 *
 * NOTE: DASH-T-0021 expands this barrel with the full region-primitive surface
 * (`Shell.*`) + `layoutTypes` contracts + JSDoc. For now it exports the
 * `HostShell` public cluster (what the root re-exports) plus `AdminShell`.
 */

export { HostShell } from "./HostShell.js";
export { AdminShell } from "./AdminShell.js";
export { useHostSelection } from "./HostSelectionContext.js";
export { ConnectionStatus } from "./ConnectionStatus.js";
export type { ConnectionStatusProps } from "./ConnectionStatus.js";
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
export type { AdminShellProps, ShellSlots } from "./layoutTypes.js";
