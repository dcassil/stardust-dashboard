/**
 * `@stardust-cms/dashboard` layout (structure) barrel.
 *
 * The public entry for the structure layer. It exposes three composition levels
 * for dashboard layout:
 *
 * Use Case 1 — turnkey: drop in {@link AdminShell} or the configured
 * {@link HostShell} wrapper and get the default full layout. `HostShell` owns the
 * iframe/store wiring and uses `AdminShell` as its region substrate.
 *
 * Use Case 2 — surgical: keep {@link AdminShell}, but pass typed `slots` and
 * props overrides. Each slot receives a documented contract object from
 * {@link ShellSlots}; consumers override one part without rebuilding landmarks,
 * responsive behavior, modal a11y, or canvas wiring.
 *
 * Use Case 3 — fully-custom: compose {@link Shell.Root} and the individual
 * `Shell.*` regions yourself. The region primitives remain the source of truth
 * for landmark roles, responsive sidebar collapse, preview-mode overlay
 * suppression, and modal focus-trap / restore / Escape behavior.
 *
 * Preview ownership: when the overlay mode is `preview`, the consumer's
 * `HostShellProps.renderLayout` is bypassed in favor of the full-bleed canvas.
 * The default overlay layer also suppresses editing chrome in preview.
 *
 * Reserved seams: `navigation` and `account.currentUser` are intentionally typed
 * as designed-for-later extension points, matching DASH-I-0001's reserved
 * extension section. They can be filled additively by later navigation and
 * current-user controllers.
 */

/**
 * Use Case 1 turnkey shell wrapper. `HostShell` configures providers, canvas
 * mechanics, store seams, connection status, and the default `AdminShell`
 * composition while preserving its SIFR-T-0033 public cluster.
 */
export { HostShell } from "./HostShell.js";

/**
 * Use Case 1 turnkey region substrate and Use Case 2 surgical override surface.
 * `AdminShell` composes the public region primitives with `ShellSlots`; the
 * slot contracts are typed below, while regions keep their own responsive and
 * accessibility behavior internally.
 */
export { AdminShell } from "./AdminShell.js";

/**
 * Use Case 3 fully-custom compound namespace. Compose `Shell.Root` with
 * `Shell.TopBar`, `Shell.Sidebar`, `Shell.MainContent`, `Shell.ModalHost`, and
 * the other public region primitives when the default `AdminShell` structure is
 * not the right shape.
 */
export { Shell } from "./Shell.js";

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

/**
 * Slot and layout contracts for Use Case 2 surgical overrides. `ShellSlots`
 * maps each named slot to its renderer contract:
 * `TopbarContract`, `SidebarContract`, `PageHeaderContract`,
 * `ContentWrapperContract`, `ModalContentContract`, `EmptySlotContract`,
 * `LoadingSlotContract`, `AccountContract`, and `ActionAreaContract`.
 *
 * Consumers receive typed objects, not region DOM props. The layout primitives
 * retain ownership of landmarks, responsive collapse, and modal accessibility.
 */
export type {
  AdminShellProps,
  ShellSlots,
  LayoutRegionName,
  RegionProps,
  EmptySlotContract,
  LoadingSlotContract,
  ModalContentContract,
  AccountContract,
  ActionAreaContract,
  TopbarContract,
  SidebarContract,
  PageHeaderContract,
  ContentWrapperContract,
} from "./layoutTypes.js";

/**
 * Prop contracts for Use Case 3 fully-custom region composition. These are the
 * exact props accepted by each `Shell.*` member; `RegionMarker` is the marker
 * interface regions use so `Shell.Root` can respect `visibleRegions`.
 */
export type {
  ShellRootProps,
  RegionMarker,
} from "./ShellRoot.js";
export type { MainContentProps } from "./MainContent.js";
export type { TopBarProps } from "./TopBar.js";
export type { SidebarProps } from "./Sidebar.js";
export type { SidePanelProps } from "./SidePanel.js";
export type { ModalHostProps } from "./ModalHost.js";
export type { OverlayLayerProps } from "./OverlayLayer.js";
export type { IframeAreaProps } from "./IframeArea.js";
export type { FooterProps } from "./Footer.js";
export type { CommandRegionProps } from "./CommandRegion.js";

/**
 * Stable `sd-*` class hooks for styling the public layout regions. Theme work
 * imports these constants instead of duplicating string literals.
 */
export {
  SD_SHELL_ROOT,
  SD_TOPBAR,
  SD_SIDEBAR,
  SD_MAIN_CONTENT,
  SD_SIDE_PANEL,
  SD_MODAL_HOST,
  SD_OVERLAY_LAYER,
  SD_IFRAME_AREA,
  SD_FOOTER,
  SD_COMMAND_REGION,
} from "./layoutTypes.js";
