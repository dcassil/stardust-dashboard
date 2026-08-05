import type { ReactNode } from "react";
import { useState } from "react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SidebarContext } from "../admin/adminContext.js";
import type { SidebarState } from "../admin";
import { Sidebar } from "./Sidebar.js";

afterEach(cleanup);

const tabs: readonly { id: string; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "style", label: "Style" },
];

function required(container: ParentNode, selector: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

function Harness({
  children,
  onActiveTab,
}: {
  children: ReactNode;
  onActiveTab?: (tab: string | null) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTabState] = useState<string | null>("content");
  const sidebar: SidebarState = {
    open,
    collapsed,
    activeTab,
    setOpen: (next) => {
      setOpen(next);
    },
    toggle: () => {
      setOpen((current) => !current);
    },
    collapse: (next) => {
      setCollapsed(next);
    },
    setActiveTab: (tab) => {
      onActiveTab?.(tab);
      setActiveTabState(tab);
    },
  };
  return (
    <SidebarContext.Provider value={sidebar}>
      {children}
    </SidebarContext.Provider>
  );
}

describe("DASH-T-0033 - Sidebar compound", () => {
  it("composes parts in any order and binds controls to sidebar state (TC-001)", () => {
    const changes: (string | null)[] = [];
    const { container } = render(
      <Harness
        onActiveTab={(tab) => {
          changes.push(tab);
        }}
      >
        <Sidebar.Trigger />
        <Sidebar.Collapse />
        <Sidebar.TabContent tab="content">Content panel</Sidebar.TabContent>
        <Sidebar.Tabs tabs={tabs} />
        <Sidebar.Root aria-label="Tools">
          <Sidebar.Footer>Footer</Sidebar.Footer>
          <Sidebar.Header>Header</Sidebar.Header>
          <Sidebar.Body>Body</Sidebar.Body>
        </Sidebar.Root>
        <Sidebar.TabContent tab="style">Style panel</Sidebar.TabContent>
      </Harness>,
    );

    const root = required(container, ".sd-sidebar");
    expect(root.getAttribute("data-open")).toBe("false");
    expect(screen.getByText("Content panel")).toBeDefined();
    expect(screen.queryByText("Style panel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    expect(root.getAttribute("data-open")).toBe("true");

    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapse.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(collapse);
    expect(collapse.getAttribute("aria-pressed")).toBe("true");
    expect(root.classList.contains("sd-sidebar--collapsed")).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "Style" }));
    expect(changes).toEqual(["style"]);
    expect(screen.queryByText("Content panel")).toBeNull();
    expect(screen.getByText("Style panel")).toBeDefined();
  });

  it("passes the navigation render-prop contract without replacing regions (TC-002)", () => {
    const seen: (string | null)[] = [];
    render(
      <Harness>
        <Sidebar.Root>
          <Sidebar.Header>{() => <h2>Inspector</h2>}</Sidebar.Header>
          <Sidebar.Navigation>
            {(contract) => {
              seen.push(contract.activeTab);
              return (
                <button
                  type="button"
                  onClick={() => {
                    contract.setActiveTab("style");
                  }}
                >
                  Use style
                </button>
              );
            }}
          </Sidebar.Navigation>
          <Sidebar.Footer>Ready</Sidebar.Footer>
        </Sidebar.Root>
      </Harness>,
    );

    expect(screen.getByRole("heading", { name: "Inspector" })).toBeDefined();
    expect(screen.getByText("Ready")).toBeDefined();
    expect(seen).toEqual(["content"]);

    fireEvent.click(screen.getByRole("button", { name: "Use style" }));
    expect(seen).toEqual(["content", "style"]);
  });

  it("has no axe violations for a composed sidebar", async () => {
    const { container } = render(
      <Harness>
        <Sidebar.Root>
          <Sidebar.Header>
            <h2>Inspector</h2>
          </Sidebar.Header>
          <Sidebar.Navigation>
            <Sidebar.Tabs tabs={tabs} />
          </Sidebar.Navigation>
          <Sidebar.Body>
            <Sidebar.TabContent tab="content">Content tools</Sidebar.TabContent>
          </Sidebar.Body>
          <Sidebar.Footer>
            <Sidebar.Trigger />
            <Sidebar.Collapse />
          </Sidebar.Footer>
        </Sidebar.Root>
      </Harness>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
