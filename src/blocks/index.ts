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
// DASH-T-0031 — the standalone field-editing core (controller-routed). Root
// re-export + the rest of the panel surface land in DASH-T-0041.
export { FieldEditor } from "./FieldEditor.js";
export type { FieldEditorProps } from "./FieldEditor.js";
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
