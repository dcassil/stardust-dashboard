/**
 * `@stardust-cms/dashboard` block-registry barrel — the public entry of the
 * `blocks` layer (SIFR-T-0034). Cross-layer consumers (shell, the package root)
 * import the block registry, palette, and side panel ONLY through this entry;
 * the module-boundary rules in `eslint.config.mjs` forbid reaching into the
 * layer's internal files directly.
 */

export type {
  BlockType,
  BlockTypeRegistry,
  BlockFieldPatch,
  StyleField,
} from "./BlockType.js";
export { findBlockType } from "./BlockType.js";
export {
  DEFAULT_IMAGE_UPLOADS_KEY,
  ImageField,
} from "./ImageField.js";
export type {
  ImageFieldClassNames,
  ImageFieldProps,
} from "./ImageField.js";
export {
  createImageBlockType,
  imageBlockType,
} from "./imageBlockType.js";
export type {
  ImageBlockTypeOptions,
} from "./imageBlockType.js";
export { Palette } from "./Palette.js";
export type { PaletteProps } from "./Palette.js";
export { SidePanel } from "./SidePanel.js";
export type { SidePanelProps } from "./SidePanel.js";
// DASH-T-0031/0032/0037 — composable panel surface (controller-routed).
// Root re-export lands in DASH-T-0041.
export { FieldEditor } from "./FieldEditor.js";
export type { FieldEditorProps } from "./FieldEditor.js";
export { EditPanel } from "./EditPanel.js";
export type { EditPanelProps } from "./EditPanel.js";
export { PresenceIndicator } from "./PresenceIndicator.js";
export type {
  PresenceIndicatorProps,
  PresenceSource,
  RemotePresence,
} from "./PresenceIndicator.js";
// DASH-T-0033 — compound Sidebar shell (+ parts) and its part contracts.
export { Sidebar } from "./Sidebar.js";
export type {
  SidebarBodyProps,
  SidebarButtonProps,
  SidebarNavigationChildren,
  SidebarNavigationContract,
  SidebarNavigationProps,
  SidebarRegionChildren,
  SidebarRegionContract,
  SidebarRegionProps,
  SidebarRootProps,
  SidebarTab,
  SidebarTabContentProps,
  SidebarTabsProps,
} from "./Sidebar.js";
// DASH-T-0036 — schema-driven style panel.
export { StylePanel } from "./StylePanel.js";
export type { StylePanelProps } from "./StylePanel.js";
// DASH-T-0039 — single-source panel sd-* class-hook catalog (DASH-I-0004 styles).
export {
  SD_SIDE_PANEL,
  SD_PANEL_SECTION,
  SD_EDIT_PANEL,
  SD_FIELD_EDITOR,
  SD_STYLE_PANEL,
  SD_PRESENCE,
  SD_PALETTE,
} from "./panelTypes.js";
export { safeLocalStorage } from "./safeLocalStorage.js";
export type { SafeLocalStorage } from "./safeLocalStorage.js";
export {
  createUploadRegistry,
  isDemoUpload,
  readFileAsDataUrl,
} from "./uploads.js";
export type {
  DemoUpload,
  UploadRegistry,
  UploadRegistryOptions,
} from "./uploads.js";
