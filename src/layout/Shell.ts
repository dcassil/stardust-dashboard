import { CommandRegion } from "./CommandRegion.js";
import { Footer } from "./Footer.js";
import { IframeArea } from "./IframeArea.js";
import { MainContent } from "./MainContent.js";
import { ModalHost } from "./ModalHost.js";
import { OverlayLayer } from "./OverlayLayer.js";
import { ShellRoot } from "./ShellRoot.js";
import { SidePanel } from "./SidePanel.js";
import { Sidebar } from "./Sidebar.js";
import { TopBar } from "./TopBar.js";

/**
 * Compound namespace for the public layout region primitives.
 *
 * Use Case 3: fully-custom composition imports `Shell` and assembles
 * `Shell.Root` with only the regions a dashboard needs. Each member is the
 * existing region component, so its prop type is preserved exactly:
 * `Shell.Root` is `ShellRoot`, `Shell.TopBar` is `TopBar`, and so on.
 *
 * The primitives encapsulate their own structure-layer behavior. Consumers do
 * not wire landmark roles, responsive sidebar collapse, preview-mode overlay
 * suppression, or modal focus-trap / focus-restore / Escape handling when they
 * compose these regions directly.
 */
const Shell = {
  Root: ShellRoot,
  TopBar,
  Sidebar,
  MainContent,
  SidePanel,
  ModalHost,
  OverlayLayer,
  IframeArea,
  Footer,
  CommandRegion,
} as const;

export { Shell };
