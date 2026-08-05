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
/* Composable content overlay (DASH-I-0002)                                   */
/* -------------------------------------------------------------------------- */

// The compound overlay + standalone action primitives (DASH-T-0023…0029). All
// ADDITIVE — the bundled `Overlays` above is unchanged. The compound parts route
// select/edit/remove/move/add through the DASH-I-0001 editing controller
// (`useEditingActions`), so they require an `AdminProvider`; they are geometry-
// free (they consume already-mapped `child.geometry`, never recompute it).
//
// The canonical zero-fork composition (Use Case 1) — a consumer drops a custom
// control into the `.Actions` slot and it reaches the same capabilities as the
// default buttons, positioned over the item, with no forking:
//
//   <ContentOverlay target={mappedTarget}>
//     <ContentOverlay.SelectionRing />
//     <ContentOverlay.Actions>
//       <EditButton onClick={() => openMyModal(target)} />
//       <RemoveButton />
//     </ContentOverlay.Actions>
//   </ContentOverlay>
//
// Children read the item via `useContentOverlayContext()` (`{ target, child,
// ref }`) — the stable, documented slot contract — plus the frozen editing
// hooks. Every primitive is default-styled via `sd-*` class hooks (styled by
// DASH-I-0004) and also usable standalone with an explicit `itemRef`/`target`.
export {
  ContentOverlay,
  useContentOverlayContext,
  SelectionRing,
  ContentOverlayActions,
  EditButton,
  RemoveButton,
  MoveHandle,
  InsertZone,
  SD_CONTENT_OVERLAY,
  SD_CONTENT_OVERLAY_ITEM,
  SD_SELECTION_RING,
  SD_ACTIONS,
  SD_EDIT_BUTTON,
  SD_REMOVE_BUTTON,
  SD_MOVE_HANDLE,
  SD_INSERT_ZONE,
} from "./overlays";
export type {
  ContentOverlayProps, ContentOverlayContextValue, SelectionRingProps,
  ContentOverlayActionsProps, EditButtonProps, RemoveButtonProps,
  MoveHandleProps, InsertZoneProps, InsertPayloadMapper,
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

/* -------------------------------------------------------------------------- */
/* Composable sidebar + editing panels (DASH-I-0003)                          */
/* -------------------------------------------------------------------------- */

// The placement-agnostic panels: `FieldEditor`/`EditPanel`/`StylePanel` route
// edits through the DASH-I-0001 controller (`useEditingActions().change`); the
// compound `Sidebar` binds to `useSidebarState()`; `SidePanel` is a compound
// (`.Section`/`.Content`, selection defaulting from `useSelection()`, props win);
// `PresenceIndicator` is a data-agnostic presence mount. All emit `sd-*` hooks
// (single-sourced in the panel catalog) and require an `AdminProvider`. Additive
// — the existing `Palette`/`SidePanel`/`BlockType` surface is unchanged.
// NOTE: `SD_SIDE_PANEL` is already exported (the layout region hook, same class
// string), so it is not re-exported here.
export {
  FieldEditor, EditPanel, StylePanel, PresenceIndicator, Sidebar,
  SD_PANEL_SECTION, SD_EDIT_PANEL, SD_FIELD_EDITOR, SD_STYLE_PANEL,
  SD_PRESENCE, SD_PALETTE,
} from "./blocks";
export type {
  StyleField, FieldEditorProps, EditPanelProps, StylePanelProps,
  SidePanelSectionProps, SidePanelContentViewProps,
  PresenceIndicatorProps, PresenceSource, RemotePresence,
  SidebarBodyProps, SidebarButtonProps, SidebarNavigationChildren,
  SidebarNavigationContract, SidebarNavigationProps, SidebarRegionChildren,
  SidebarRegionContract, SidebarRegionProps, SidebarRootProps,
  SidebarTab, SidebarTabContentProps, SidebarTabsProps,
} from "./blocks";
