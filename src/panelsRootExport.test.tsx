/**
 * DASH-T-0041 — the composable panels surface resolves from the package ROOT,
 * additively (existing `Palette`/`SidePanel`/`BlockType` exports still resolve),
 * and a canonical assembled admin type-checks + runs imported entirely from
 * `@stardust-cms/dashboard`.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  AdminProvider,
  FieldEditor,
  EditPanel,
  StylePanel,
  PresenceIndicator,
  Sidebar,
  SidePanel,
  Palette,
  SD_STYLE_PANEL,
  SD_PRESENCE,
} from ".";
import type {
  StyleField,
  EditPanelProps,
  StylePanelProps,
  SidebarTab,
  PresenceSource,
  BlockTypeRegistry,
  ContentStoreAdapter,
  ContentSnapshot,
} from ".";

afterEach(cleanup);

function fakeStore(): ContentStoreAdapter {
  return { getSnapshot: (): ContentSnapshot => [], apply: (): ContentSnapshot => [] };
}

const registry: BlockTypeRegistry = [{ type: "text", label: "Text" }];

describe("DASH-T-0041 — composable panels root surface (TC-001)", () => {
  it("resolves every panel export from the package root (additive)", () => {
    for (const fn of [
      FieldEditor,
      EditPanel,
      StylePanel,
      PresenceIndicator,
      Sidebar,
      SidePanel,
      Palette,
    ]) {
      expect(typeof fn).toBe("function");
    }
    // Compound static parts.
    expect(typeof Sidebar.Root).toBe("function");
    expect(typeof Sidebar.Tabs).toBe("function");
    expect(typeof SidePanel.Section).toBe("function");
    expect(typeof SidePanel.Content).toBe("function");
    // sd-* hooks.
    expect([SD_STYLE_PANEL, SD_PRESENCE]).toEqual(["sd-style-panel", "sd-presence"]);
  });

  it("runs a canonical assembled admin imported from the root", () => {
    // Type surface referenced so the public panel types are compile-checked.
    const _tabs: readonly SidebarTab[] = [{ id: "fields", label: "Fields" }];
    const _style: readonly StyleField[] = [{ key: "color", label: "Color", kind: "color" }];
    const _edit: EditPanelProps = { blockTypes: registry };
    const _stylePanel: StylePanelProps = { blockTypes: registry };
    const _presence: PresenceSource = [];
    void [_tabs, _style, _edit, _stylePanel, _presence];

    function Admin(): ReactNode {
      return (
        <AdminProvider store={fakeStore()}>
          <Sidebar.Root>
            <Sidebar.Body>
              <SidePanel blockTypes={registry}>
                <SidePanel.Section title="Blocks">
                  <Palette blockTypes={registry} />
                </SidePanel.Section>
                <SidePanel.Content blockTypes={registry} />
              </SidePanel>
              <EditPanel blockTypes={registry} />
              <StylePanel blockTypes={registry} />
              <PresenceIndicator />
            </Sidebar.Body>
          </Sidebar.Root>
        </AdminProvider>
      );
    }

    const { container } = render(<Admin />);
    // The assembled admin mounts; the palette entry + a content hint are present.
    expect(container.querySelector('[data-testid="palette-item-text"]')).not.toBeNull();
    expect(container.textContent).toContain("Click a block in the preview to edit it.");
  });
});
