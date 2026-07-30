/**
 * @stardust-cms/dashboard — public entry point.
 *
 * This is the host-dashboard boilerplate for building in-iframe visual editors on
 * top of `@stardust-cms/iframe-adapter`. The store seam (`ContentStoreAdapter`,
 * `HostContentOp`, `StoreProvider`, `useContentStore`) is exported below; the
 * rest of the surface (`HostShell`, `BlockType`, overlay/panel wrappers, theme
 * tokens) is filled in by later tasks.
 *
 * INVARIANT (NFR-001): nothing under `src/**` may import a content store or
 * `versioned-content-engine`. The store enters only through the
 * `ContentStoreAdapter` interface (a later task), and `versioned-content-engine`
 * lives only in the example, never in this package. Enforced by
 * `.dependency-cruiser.cjs`.
 */

export const DASHBOARD_PACKAGE = "@stardust-cms/dashboard" as const;

export type DashboardPackageName = typeof DASHBOARD_PACKAGE;

/* -------------------------------------------------------------------------- */
/* Store seam (SIFR-T-0031)                                                   */
/* -------------------------------------------------------------------------- */

export type {
  ContentStoreAdapter,
  ContentSnapshot,
  HostContentOp,
  HostContentOpKind,
  DeleteOp,
  EditOp,
} from "./store/adapter.js";
export { dispatchStoreOp } from "./store/adapter.js";

export { StoreProvider, useContentStore } from "./store/StoreProvider.js";
export type {
  StoreProviderProps,
  ContentStoreContextValue,
} from "./store/StoreProvider.js";

// Re-export the host op types that make up HostContentOp so consumers building
// ops (and the reference VCE adapter in SIFR-T-0032) get the full vocabulary
// from one entry point. These are the SIFR contract boundary, re-exported as-is.
export type {
  InsertOp,
  MoveOp,
  SelectOp,
  ContentLocation,
} from "@stardust-cms/iframe-adapter/host";

/* -------------------------------------------------------------------------- */
/* Host shell (SIFR-T-0033)                                                   */
/* -------------------------------------------------------------------------- */

export {
  HostShell,
  ConnectionStatus,
  DEFAULT_IFRAME_ORIGIN,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_DESIGN_HEIGHT,
} from "./shell/index.js";
export type {
  HostShellProps,
  HostShellLayoutParts,
  ConnectionStatusProps,
} from "./shell/index.js";

/* -------------------------------------------------------------------------- */
/* Block registry (SIFR-T-0034)                                               */
/* -------------------------------------------------------------------------- */

export type {
  BlockType,
  BlockTypeRegistry,
  BlockFieldPatch,
} from "./blocks/BlockType.js";
export { findBlockType } from "./blocks/BlockType.js";
export { Palette } from "./blocks/Palette.js";
export type { PaletteProps } from "./blocks/Palette.js";
export { SidePanel } from "./blocks/SidePanel.js";
export type { SidePanelProps } from "./blocks/SidePanel.js";
