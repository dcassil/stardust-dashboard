/**
 * DASH-T-0019 — `AdminShell`, the TURNKEY default App Shell (the load-bearing
 * "level 1" deliverable of DASH-I-0005).
 *
 * Assembles the whole default admin ENTIRELY from PUBLIC primitives (REQ-007):
 * the region primitives (`ShellRoot` + the eight regions, this layer's siblings)
 * + public content barrels (`../overlays` `Overlays`) + the `useExtensions`
 * registry auto-render — importing NO package-private module. A dependency-cruiser
 * rule (`layout-public-entry-only`) + a source-scan test (`AdminShell.boundary.test.ts`)
 * PROVE that (NFR-001): the default admin needs no package internals to rebuild.
 *
 * Composition (see DASH-I-0005 Architecture): `Shell.Root` →
 *   TopBar(stub) · Sidebar(auto-rendered `panels`) · MainContent(IframeArea +
 *   OverlayLayer hosting the `Overlays` chrome) · SidePanel · ModalHost ·
 *   Footer(stub) · CommandRegion(stub, auto-renders `tools`).
 *
 * BEHAVIOR ARRIVES VIA CONTEXT (REQ-008): `AdminShell` is pure structure — it
 * holds no config and takes only `slots`/`className`/`style`. It MUST be mounted
 * inside an `AdminProvider` (UI-state + registries) AND a `CanvasProvider` (the
 * scaled-canvas engine the overlay + iframe regions read via `useCanvas`); the
 * DASH-T-0020 `HostShell` thin-wrapper supplies both.
 *
 * BOUNDARY: React + the `admin`/`overlays` public barrels + `./layout` siblings.
 */

import type { ReactNode } from "react";
import { useExtensions } from "../admin";
import { useCanvas } from "../shell";
import { Overlays } from "../overlays";
import { ShellRoot } from "./ShellRoot.js";
import { TopBar } from "./TopBar.js";
import { Sidebar } from "./Sidebar.js";
import { MainContent } from "./MainContent.js";
import { SidePanel } from "./SidePanel.js";
import { ModalHost } from "./ModalHost.js";
import { Footer } from "./Footer.js";
import { CommandRegion } from "./CommandRegion.js";
import type { AdminShellProps } from "./layoutTypes.js";

/**
 * The default overlay chrome: the bundled {@link Overlays} fed from the canvas
 * engine (`useCanvas`). Mounted as `MainContent`'s children → `OverlayLayer`,
 * which suppresses it in preview mode. This is the DASH-I-0002 overlay mount.
 */
function AdminOverlay(): ReactNode {
  const { targets, callbacks, selectedTargetId, selectedContentId } = useCanvas();
  return (
    <Overlays
      targets={targets}
      callbacks={callbacks}
      selectedTargetId={selectedTargetId}
      selectedContentId={selectedContentId}
    />
  );
}

/**
 * Auto-render seam (REQ-007/010): render every registered `panels` contribution.
 * A consumer registers their palette / edit panel (with their own block types) as
 * a `panels` extension; the turnkey shell mounts them in the `Sidebar` without
 * hard-wiring any block-type config — keeping `AdminShell` config-free.
 */
function RegisteredPanels(): ReactNode {
  const panels = useExtensions("panels");
  return (
    <>
      {panels.map((panel) => (
        <div key={panel.id} className="sd-panel">
          {panel.render()}
        </div>
      ))}
    </>
  );
}

export function AdminShell({
  slots,
  className,
  style,
  overlay,
}: AdminShellProps): ReactNode {
  const slotsProp = slots ? { slots } : {};
  return (
    <ShellRoot
      {...(className !== undefined ? { className } : {})}
      {...(style !== undefined ? { style } : {})}
    >
      <TopBar {...slotsProp} />
      <Sidebar {...slotsProp}>
        <RegisteredPanels />
      </Sidebar>
      <MainContent {...slotsProp}>{overlay ?? <AdminOverlay />}</MainContent>
      <SidePanel />
      <ModalHost {...slotsProp} />
      <Footer />
      <CommandRegion />
    </ShellRoot>
  );
}
