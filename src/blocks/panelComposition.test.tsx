/**
 * DASH-T-0040 — panels composition-mode + a11y + coverage backstop.
 *
 * TC-002 proves the FIVE shell⇄content composition modes (each without forking),
 * and the remaining cases fill the panel coverage: StylePanel control kinds +
 * value/patch branches + renderStyle + edit routing, EditPanel/SidePanel dispatch
 * branches, and Sidebar named-slot/tab branches. The frozen `SidePanel.test.tsx`
 * / `Palette.test.tsx` / `BlockType.test.ts` prove store-routed back-compat and
 * are left untouched.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { AdminProvider } from "../admin";
import { SidebarContext } from "../admin/adminContext.js";
import type { SidebarState } from "../admin";
import { useEditingActions } from "../editing";
import type { EditingActions } from "../editing";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import type { BlockTypeRegistry } from "./BlockType.js";
import { EditPanel } from "./EditPanel.js";
import { StylePanel } from "./StylePanel.js";
import { SidePanel } from "./SidePanel.js";
import { Sidebar } from "./Sidebar.js";
import { Palette } from "./Palette.js";

afterEach(cleanup);

const content: CmsContent = {
  id: "c1",
  type: "text",
  value: "Hello",
  styleGroup: "bold",
  column: true,
  data: { color: "#ffffff", size: "12", label: "cap" },
};
const imageContent: CmsContent = { id: "i1", type: "image", value: "" };
const snapshot: ContentSnapshot = [
  { targetId: "t1", contentId: "c1", index: 0, content },
  { targetId: "t1", contentId: "i1", index: 1, content: imageContent },
];

function makeStore(): ContentStoreAdapter {
  return { getSnapshot: () => snapshot, apply: () => snapshot };
}

const registry: BlockTypeRegistry = [
  {
    type: "text",
    label: "Text",
    renderField: (c) => <div data-testid="field">edit:{c.value}</div>,
    styleSchema: [
      { key: "styleGroup", label: "Group", kind: "select", options: ["bold", "light"] },
      { key: "color", label: "Color", kind: "color" },
      { key: "size", label: "Size", kind: "number" },
      { key: "label", label: "Label", kind: "text" },
      { key: "column", label: "Column", kind: "text" },
    ],
  },
  {
    type: "image",
    label: "Image",
    renderStyle: (_c, onEdit) => (
      <button
        type="button"
        data-testid="render-style"
        onClick={() => {
          onEdit({ styleGroup: "x" });
        }}
      >
        style
      </button>
    ),
  },
];

/** Render under AdminProvider, capturing the controller actions. */
function renderAdmin(ui: ReactNode): { actions: EditingActions; container: HTMLElement } {
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

/** A controllable sidebar harness (open is internal state so Trigger toggles). */
function sidebarState(over: Partial<SidebarState> = {}): SidebarState {
  return {
    open: true,
    collapsed: false,
    activeTab: "fields",
    setOpen: () => undefined,
    toggle: () => undefined,
    collapse: () => undefined,
    setActiveTab: () => undefined,
    ...over,
  };
}

/* -------------------------------------------------------------------------- */
/* TC-002 — the five shell⇄content composition modes                          */
/* -------------------------------------------------------------------------- */

describe("DASH-T-0040 — five shell⇄content composition modes (TC-002)", () => {
  it("mode 1: default whole — Sidebar hosting SidePanel(Palette + Content)", () => {
    const { container } = renderAdmin(
      <Sidebar.Root>
        <Sidebar.Body>
          <SidePanel blockTypes={registry}>
            <SidePanel.Section title="Blocks">
              <Palette blockTypes={registry} />
            </SidePanel.Section>
            <SidePanel.Content blockTypes={registry} />
          </SidePanel>
        </Sidebar.Body>
      </Sidebar.Root>,
    );
    expect(container.querySelector('[data-testid="palette-item-text"]')).not.toBeNull();
    expect(container.textContent).toContain("Click a block in the preview to edit it.");
  });

  it("mode 2: default shell + custom (non-Stardust) content", () => {
    const { container } = renderAdmin(
      <Sidebar.Root>
        <Sidebar.Body>
          <div data-testid="custom-content">my own panel</div>
        </Sidebar.Body>
      </Sidebar.Root>,
    );
    expect(container.querySelector('[data-testid="custom-content"]')?.textContent).toBe(
      "my own panel",
    );
    expect(container.querySelector(".sd-sidebar")).not.toBeNull();
  });

  it("mode 3: Stardust content in a custom (non-Stardust) shell / bare div", () => {
    const { actions, container } = renderAdmin(
      <aside className="my-shell">
        <EditPanel blockTypes={registry} />
      </aside>,
    );
    expect(container.querySelector(".my-shell")).not.toBeNull();
    act(() => {
      actions.startEditing({ targetId: "t1", contentId: "c1" });
    });
    expect(container.querySelector('[data-testid="field"]')?.textContent).toBe("edit:Hello");
  });

  it("mode 4: replace one region (Navigation slot) — siblings intact", () => {
    const seen: { tab: string | null } = { tab: "unset" };
    render(
      <SidebarContext.Provider value={sidebarState({ activeTab: "style" })}>
        <Sidebar.Root>
          <Sidebar.Header>header stays</Sidebar.Header>
          <Sidebar.Navigation>
            {(nav) => {
              seen.tab = nav.activeTab;
              return <div data-testid="custom-nav">nav:{nav.activeTab}</div>;
            }}
          </Sidebar.Navigation>
        </Sidebar.Root>
      </SidebarContext.Provider>,
    );
    expect(seen.tab).toBe("style");
    // Sibling region untouched.
    expect(document.body.textContent).toContain("header stays");
  });

  it("mode 5: assemble from primitives — tabs + content + edit panel", () => {
    const { actions, container } = renderAdmin(
      <Sidebar.Root>
        <Sidebar.Tabs tabs={[{ id: "fields", label: "Fields" }]} />
        <SidePanel.Content blockTypes={registry} />
        <EditPanel blockTypes={registry} />
      </Sidebar.Root>,
    );
    act(() => {
      actions.select({ targetId: "t1", contentId: "c1" });
    });
    // Content panel resolves the selected item from the controller.
    expect(container.querySelector('[data-testid="field"]')).not.toBeNull();
  });

  it("assembled admin has no axe violations", async () => {
    const { container } = renderAdmin(
      <Sidebar.Root>
        <Sidebar.Body>
          <SidePanel blockTypes={registry}>
            <SidePanel.Section title="Blocks">
              <Palette blockTypes={registry} />
            </SidePanel.Section>
          </SidePanel>
        </Sidebar.Body>
      </Sidebar.Root>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

/* -------------------------------------------------------------------------- */
/* Coverage — StylePanel control kinds + value/patch + routing                */
/* -------------------------------------------------------------------------- */

describe("DASH-T-0040 — StylePanel coverage", () => {
  it("renders every styleSchema control kind seeded from content", () => {
    const { actions, container } = renderAdmin(
      <StylePanel blockTypes={registry} snapshot={snapshot} />,
    );
    act(() => {
      actions.select({ targetId: "t1", contentId: "c1" });
    });
    // select (styleGroup) seeded from content.styleGroup; color/number/text from data.
    const select = container.querySelector<HTMLSelectElement>("select");
    expect(select?.value).toBe("bold");
    expect(container.querySelector('input[type="color"]')).not.toBeNull();
    expect(container.querySelector('input[type="number"]')).not.toBeNull();
    expect(container.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(1);
  });

  it("routes a style edit through the controller change action", () => {
    const { actions, container } = renderAdmin(
      <StylePanel blockTypes={registry} snapshot={snapshot} />,
    );
    act(() => {
      actions.select({ targetId: "t1", contentId: "c1" });
    });
    const changeSpy = vi.spyOn(actions, "change");
    const select = container.querySelector<HTMLSelectElement>("select");
    if (select === null) {
      throw new Error("no select");
    }
    fireEvent.change(select, { target: { value: "light" } });
    expect(changeSpy).toHaveBeenCalledWith({
      kind: "edit",
      targetId: "t1",
      contentId: "c1",
      patch: { styleGroup: "light" },
    });
  });

  it("uses renderStyle when the block provides it (+ onChange override)", () => {
    const onChange = vi.fn();
    const { actions, container } = renderAdmin(
      <StylePanel blockTypes={registry} snapshot={snapshot} onChange={onChange} />,
    );
    act(() => {
      actions.select({ targetId: "t1", contentId: "i1" });
    });
    const btn = container.querySelector('[data-testid="render-style"]');
    if (btn === null) {
      throw new Error("render-style button not found");
    }
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith({ styleGroup: "x" });
  });

  it("shows the hint when nothing is selected", () => {
    const { container } = renderAdmin(<StylePanel blockTypes={registry} snapshot={snapshot} />);
    expect(container.textContent).toContain("Select a block to edit its style.");
  });

  it("honors an explicit editingRef override", () => {
    const { container } = renderAdmin(
      <StylePanel
        blockTypes={registry}
        snapshot={snapshot}
        editingRef={{ targetId: "t1", contentId: "c1" }}
      />,
    );
    expect(container.querySelector("select")).not.toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Coverage — Sidebar tab/collapse/trigger branches                           */
/* -------------------------------------------------------------------------- */

describe("DASH-T-0040 — Sidebar branch coverage", () => {
  it("TabContent shows only the active tab; Trigger/Collapse call the controller", () => {
    const calls: string[] = [];
    const state = sidebarState({
      open: false,
      activeTab: "fields",
      toggle: () => {
        calls.push("toggle");
      },
      collapse: () => {
        calls.push("collapse");
      },
    });
    const { getByRole, queryByText } = render(
      <SidebarContext.Provider value={state}>
        <Sidebar.Root>
          <Sidebar.TabContent tab="fields">FIELDS</Sidebar.TabContent>
          <Sidebar.TabContent tab="style">STYLE</Sidebar.TabContent>
          <Sidebar.Trigger />
          <Sidebar.Collapse />
        </Sidebar.Root>
      </SidebarContext.Provider>,
    );
    expect(queryByText("FIELDS")).not.toBeNull();
    expect(queryByText("STYLE")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Toggle sidebar" }));
    fireEvent.click(getByRole("button", { name: "Collapse sidebar" }));
    expect(calls).toEqual(["toggle", "collapse"]);
  });

  it("Navigation renders plain children when not a render-prop; Footer renders", () => {
    const { getByText } = render(
      <SidebarContext.Provider value={sidebarState()}>
        <Sidebar.Root>
          <Sidebar.Navigation>plain nav</Sidebar.Navigation>
          <Sidebar.Footer>foot</Sidebar.Footer>
        </Sidebar.Root>
      </SidebarContext.Provider>,
    );
    expect(getByText("plain nav")).not.toBeNull();
    expect(getByText("foot")).not.toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Coverage — SidePanel dispatch + EditPanel no-item branches                  */
/* -------------------------------------------------------------------------- */

describe("DASH-T-0040 — SidePanel / EditPanel branch coverage", () => {
  it("SidePanel container mode merges className/style", () => {
    const { container } = renderAdmin(
      <SidePanel blockTypes={registry} className="mine" style={{ padding: 4 }}>
        <SidePanel.Section title="X">body</SidePanel.Section>
      </SidePanel>,
    );
    const root = container.querySelector<HTMLElement>(".sd-side-panel");
    expect(root?.classList.contains("mine")).toBe(true);
    expect(root?.style.padding).toBe("4px");
  });

  it("EditPanel shows the hint when the edited item is not in the snapshot", () => {
    const { actions, container } = renderAdmin(
      <EditPanel blockTypes={registry} snapshot={[]} />,
    );
    act(() => {
      actions.startEditing({ targetId: "t1", contentId: "missing" });
    });
    expect(container.textContent).toContain("Click a block in the preview to edit it.");
  });
});

/* -------------------------------------------------------------------------- */
/* Coverage — edge branches (null content, data fallbacks, "value" key)        */
/* -------------------------------------------------------------------------- */

describe("DASH-T-0040 — panel edge-branch coverage", () => {
  // A content whose `data` is null (non-object fallback) + a "value"-keyed field.
  const edgeContent: CmsContent = { id: "e1", type: "text", value: "seed", data: null };
  const edgeSnapshot: ContentSnapshot = [
    { targetId: "t1", contentId: "e1", index: 0, content: edgeContent },
  ];
  const edgeRegistry: BlockTypeRegistry = [
    {
      type: "text",
      label: "Text",
      // no renderField → EditPanel/FieldEditor generic field (focusable)
      styleSchema: [
        { key: "value", label: "Value", kind: "text" },
        { key: "color", label: "Color", kind: "text" }, // data is null → "" branch
      ],
    },
  ];

  it("StylePanel: 'value'-keyed field + null-data fallback seed", () => {
    const { actions, container } = renderAdmin(
      <StylePanel blockTypes={edgeRegistry} snapshot={edgeSnapshot} />,
    );
    act(() => {
      actions.select({ targetId: "t1", contentId: "e1" });
    });
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');
    // "value" field seeded from content.value; "color" from null data → "".
    expect(inputs[0]?.value).toBe("seed");
    expect(inputs[1]?.value).toBe("");
  });

  it("StylePanel: a null-content selection resolves to the hint", () => {
    const { actions, container } = renderAdmin(
      <StylePanel blockTypes={edgeRegistry} snapshot={edgeSnapshot} />,
    );
    act(() => {
      actions.select({ targetId: "t1", contentId: null });
    });
    expect(container.textContent).toContain("Select a block to edit its style.");
  });

  it("EditPanel: a null-content session resolves to the hint (no focusable)", () => {
    const { actions, container } = renderAdmin(
      <EditPanel blockTypes={edgeRegistry} snapshot={edgeSnapshot} />,
    );
    act(() => {
      actions.startEditing({ targetId: "t1", contentId: null });
    });
    expect(container.textContent).toContain("Click a block in the preview to edit it.");
  });
});
