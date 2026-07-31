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
export { Palette } from "./Palette.js";
export type { PaletteProps } from "./Palette.js";
export { SidePanel } from "./SidePanel.js";
export type { SidePanelProps } from "./SidePanel.js";
