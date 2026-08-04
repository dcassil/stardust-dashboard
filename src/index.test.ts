import { describe, expect, it } from "vitest";
import {
  DASHBOARD_PACKAGE,
  Shell,
  AdminShell,
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
} from ".";

describe("@stardust-cms/dashboard scaffold", () => {
  it("exposes the package marker", () => {
    expect(DASHBOARD_PACKAGE).toBe("@stardust-cms/dashboard");
  });
});

// TC-001 (DASH-T-0021): the full public layout surface resolves from the root.
describe("layout public surface (DASH-T-0021)", () => {
  it("exposes AdminShell and the Shell compound namespace", () => {
    expect(typeof AdminShell).toBe("function");
    const regions = [
      Shell.Root,
      Shell.TopBar,
      Shell.Sidebar,
      Shell.MainContent,
      Shell.SidePanel,
      Shell.ModalHost,
      Shell.OverlayLayer,
      Shell.IframeArea,
      Shell.Footer,
      Shell.CommandRegion,
    ];
    expect(regions).toHaveLength(10);
    for (const region of regions) {
      expect(typeof region).toBe("function");
    }
  });

  it("exposes the sd-* region class constants", () => {
    expect([
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
    ]).toEqual([
      "sd-shell-root",
      "sd-topbar",
      "sd-sidebar",
      "sd-main-content",
      "sd-side-panel",
      "sd-modal-host",
      "sd-overlay-layer",
      "sd-iframe-area",
      "sd-footer",
      "sd-command-region",
    ]);
  });
});
