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
  SeedItem,
  DeleteOp,
  EditOp,
  StoreProviderProps,
  ContentStoreContextValue,
} from "./store";
export { dispatchStoreOp, StoreProvider, useContentStore } from "./store";

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
/* Editing behavior layer (DASH-T-0001 — FROZEN public surface)               */
/* -------------------------------------------------------------------------- */

export {
  EditingProvider,
  useSelection,
  useEditingState,
  useEditingActions,
} from "./editing";
export type {
  EditingProviderProps,
  EditingRef,
  SelectionState,
  EditingState,
  EditingActions,
  EditingCallbacks,
} from "./editing";

/* -------------------------------------------------------------------------- */
/* Admin behavior layer (DASH-T-0001 — FROZEN public surface)                 */
/* -------------------------------------------------------------------------- */

export {
  AdminProvider,
  useSidebarState,
  useModalState,
  useOverlayState,
  useLayoutState,
  useRegisterCommand,
  useCommands,
  useRegisterExtension,
  useExtensions,
  useReservedExtensions,
} from "./admin";
export type {
  AdminProviderProps,
  OverlayMode,
  OverlayState,
  SidebarState,
  ModalState,
  ModalEntry,
  LayoutState,
  Breakpoint,
  Command,
  Action,
  PanelContribution,
  ToolContribution,
  ExtensionKind,
  ReservedExtensionKind,
  AnyExtensionKind,
  ReservedContribution,
  ExtensionContribution,
} from "./admin";

/* -------------------------------------------------------------------------- */
/* Host shell (SIFR-T-0033)                                                   */
/* -------------------------------------------------------------------------- */

// Since DASH-T-0020 the `HostShell` cluster lives in the `layout` structure layer
// (it is a thin wrapper over the `AdminShell` region substrate). The shell layer
// now owns only the canvas-mechanics engine. Public API is byte-for-byte: the
// package root is the only entry, and every name below is unchanged.
export {
  HostShell,
  useHostSelection,
  ConnectionStatus,
  DEFAULT_IFRAME_ORIGIN,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_DESIGN_HEIGHT,
} from "./layout";
export type {
  HostShellProps,
  HostShellLayoutParts,
  OverlayChromeParts,
  HostSelection,
  ConnectionStatusProps,
} from "./layout";

/* -------------------------------------------------------------------------- */
/* Layout regions (DASH-T-0021)                                               */
/* -------------------------------------------------------------------------- */

export {
  AdminShell,
  Shell,
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
} from "./layout";
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
  ShellRootProps,
  MainContentProps,
  TopBarProps,
  SidebarProps,
  // `SidePanelProps` is already the (frozen) blocks side-panel props name, so the
  // layout region's props are re-exported under a disambiguated name at the root.
  SidePanelProps as ShellSidePanelProps,
  ModalHostProps,
  OverlayLayerProps,
  IframeAreaProps,
  FooterProps,
  CommandRegionProps,
  RegionMarker,
} from "./layout";

/* -------------------------------------------------------------------------- */
/* Overlay chrome (SIFR-T-0035)                                               */
/* -------------------------------------------------------------------------- */

export {
  Overlays,
  DEFAULT_TARGET_CLASS_NAME,
  DEFAULT_SELECTED_TARGET_CLASS_NAME,
  DEFAULT_CONTAINER_TARGET_CLASS_NAME,
  DEFAULT_TARGET_ITEM_CLASS_NAME,
  DEFAULT_ITEM_CLASS_NAME,
  DEFAULT_SELECTED_ITEM_CLASS_NAME,
  DEFAULT_GROUP_CLASS_NAME,
  DEFAULT_DELETE_CLASS_NAME,
} from "./overlays";
export type {
  OverlaysProps,
  ItemChromeActions,
  RenderItemChrome,
} from "./overlays";

/* -------------------------------------------------------------------------- */
/* Block registry (SIFR-T-0034)                                               */
/* -------------------------------------------------------------------------- */

export type {
  BlockType,
  BlockTypeRegistry,
  BlockFieldPatch,
  DemoUpload,
  ImageBlockTypeOptions,
  ImageFieldClassNames,
  ImageFieldProps,
  SafeLocalStorage,
  UploadRegistry,
  UploadRegistryOptions,
  PaletteProps,
  SidePanelProps,
} from "./blocks";
export {
  DEFAULT_IMAGE_UPLOADS_KEY,
  ImageField,
  createImageBlockType,
  createUploadRegistry,
  findBlockType,
  imageBlockType,
  isDemoUpload,
  readFileAsDataUrl,
  safeLocalStorage,
  Palette,
  SidePanel,
} from "./blocks";
