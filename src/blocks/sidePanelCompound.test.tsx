/**
 * DASH-T-0034 — compound `SidePanel` + controller-default selection (TC-001).
 *
 * The frozen `SidePanel.test.tsx` proves the store-routed controlled path is
 * unchanged. THIS suite proves the additive compound surface: `SidePanel.Section`
 * titled sections, `SidePanel.Content` defaulting selection from `useSelection()`
 * (props still win), and placement-agnostic mounting in a bare div.
 */

import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ContentSnapshot } from "../store";
import { AdminProvider } from "../admin";
import { useEditingActions } from "../editing";
import type { EditingActions } from "../editing";
import type { ContentStoreAdapter } from "../store";
import { SidePanel } from "./SidePanel.js";
import type { BlockTypeRegistry } from "./BlockType.js";

afterEach(cleanup);

const snapshot: ContentSnapshot = [
  { targetId: "t1", contentId: "c1", index: 0, content: { id: "c1", type: "text", value: "Hello" } },
];

function makeStore(): ContentStoreAdapter {
  return { getSnapshot: () => snapshot, apply: () => snapshot };
}

const registry: BlockTypeRegistry = [
  {
    type: "text",
    label: "Text",
    renderField: (content) => <div data-testid="editor">edit:{content.value}</div>,
  },
];

describe("DASH-T-0034 — SidePanel compound + Section", () => {
  it("renders titled sections that compose in any order", () => {
    const { getByText, container } = render(
      <SidePanel blockTypes={registry}>
        <SidePanel.Section title="Layers">
          <div>layer list</div>
        </SidePanel.Section>
        <SidePanel.Section title="Settings">
          <div>settings body</div>
        </SidePanel.Section>
      </SidePanel>,
    );
    // Container + both sections.
    expect(container.querySelector(".sd-side-panel")).not.toBeNull();
    expect(container.querySelectorAll(".sd-panel-section")).toHaveLength(2);
    expect(getByText("Layers")).not.toBeNull();
    expect(getByText("Settings")).not.toBeNull();
    expect(getByText("layer list")).not.toBeNull();
  });
});

describe("DASH-T-0034 — SidePanel.Content controller-default selection", () => {
  function renderContent(ui: ReactNode): { actions: EditingActions; container: HTMLElement } {
    const ref: { current: EditingActions | null } = { current: null };
    function Probe(): ReactNode {
      ref.current = useEditingActions();
      return null;
    }
    const { container } = render(
      <AdminProvider store={makeStore()}>
        <Probe />
        {ui}
      </AdminProvider>,
    );
    const actions = ref.current;
    if (actions === null) {
      throw new Error("actions not captured");
    }
    return { actions, container };
  }

  it("defaults its selection from useSelection() (no explicit props)", () => {
    const { actions, container } = renderContent(
      <SidePanel.Content blockTypes={registry} snapshot={snapshot} />,
    );
    // Nothing selected → hint.
    expect(container.textContent).toContain("Click a block in the preview");

    act(() => {
      actions.select({ targetId: "t1", contentId: "c1" });
    });
    // Selection resolved from the controller → the block's editor renders.
    expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe("edit:Hello");
  });

  it("lets explicit selection props win over the controller default", () => {
    const { container } = renderContent(
      // Provided (even though nothing is selected in the controller): props win.
      <SidePanel.Content
        blockTypes={registry}
        snapshot={snapshot}
        selectedTargetId="t1"
        selectedContentId="c1"
      />,
    );
    expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe("edit:Hello");
  });

  it("is placement-agnostic — the compound container works in a bare div", () => {
    const { getByText } = render(
      <div>
        <SidePanel blockTypes={registry}>
          <SidePanel.Section title="Bare">
            <span>ok</span>
          </SidePanel.Section>
        </SidePanel>
      </div>,
    );
    expect(getByText("Bare")).not.toBeNull();
    expect(getByText("ok")).not.toBeNull();
  });
});
