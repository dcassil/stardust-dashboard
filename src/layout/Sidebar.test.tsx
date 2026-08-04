/**
 * DASH-T-0016 — `Shell.Sidebar` tests.
 *
 * TC-001 (breakpoint-driven drawer collapse + keyboard-operable trigger),
 * TC-002 (the `sidebar` slot hosts content + receives its typed contract), and
 * the NFR-006 narrow-subscription probe.
 *
 * `useLayoutState().breakpoint` is fixed to `"desktop"` by the DASH-I-0001
 * skeleton (no public setter yet — real breakpoint detection is DASH-T-0007), so
 * TC-001 drives the breakpoint by INJECTING the sidebar + layout contexts
 * directly (boundaries are off for tests, which "render the internal components
 * directly"). TC-002/NFR-006 use the real `AdminProvider` (breakpoint desktop).
 */

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LayoutContext, SidebarContext } from "../admin/adminContext.js";
import type { Breakpoint, LayoutState, SidebarState } from "../admin";
import { AdminProvider, useLayoutState, useModalState } from "../admin";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { Sidebar } from "./Sidebar.js";
import type { SidebarProps } from "./Sidebar.js";
import { SD_SIDEBAR } from "./layoutTypes.js";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

/**
 * A controllable fake admin harness: `breakpoint` is a prop (drive via rerender),
 * `open` is internal state so the drawer trigger genuinely toggles it. Provides
 * only the two slices `Shell.Sidebar` reads.
 */
function Harness({
  breakpoint,
  slots,
}: {
  breakpoint: Breakpoint;
  slots?: SidebarProps["slots"];
}): ReactNode {
  const [open, setOpen] = useState(false);
  const sidebar: SidebarState = {
    open,
    collapsed: false,
    activeTab: "fields",
    setOpen: (v) => {
      setOpen(v);
    },
    toggle: () => {
      setOpen((o) => !o);
    },
    collapse: () => undefined,
    setActiveTab: () => undefined,
  };
  const layout: LayoutState = {
    visibleRegions: new Set<string>(),
    breakpoint,
    setRegionVisible: () => undefined,
  };
  return (
    <SidebarContext.Provider value={sidebar}>
      <LayoutContext.Provider value={layout}>
        <Sidebar {...(slots ? { slots } : {})} />
      </LayoutContext.Provider>
    </SidebarContext.Provider>
  );
}

describe("DASH-T-0016 — Sidebar responsive collapse + trigger (TC-001)", () => {
  it("is always-open above the drawer breakpoint and a toggleable drawer below it", () => {
    const { container, rerender } = render(<Harness breakpoint="desktop" />);

    // Desktop: no drawer trigger; the panel is present.
    expect(container.querySelector(".sd-sidebar__trigger")).toBeNull();
    expect(container.querySelector(".sd-sidebar__panel")).not.toBeNull();
    expect(container.querySelector(`aside.${SD_SIDEBAR}`)?.getAttribute("aria-label")).toBe(
      "Sidebar",
    );

    // Mobile: collapses to a drawer — trigger appears, panel hidden until opened.
    rerender(<Harness breakpoint="mobile" />);
    const trigger = container.querySelector(".sd-sidebar__trigger");
    expect(trigger).not.toBeNull();
    // A native <button> → keyboard-operable (Enter/Space) for free (NFR-003).
    expect(trigger?.tagName).toBe("BUTTON");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".sd-sidebar__panel")).toBeNull();

    // Activating the trigger opens the drawer.
    act(() => {
      fireEvent.click(trigger!);
    });
    expect(container.querySelector(".sd-sidebar__trigger")?.getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(container.querySelector(".sd-sidebar__panel")).not.toBeNull();
  });
});

describe("DASH-T-0016 — Sidebar slot hosts content (TC-002)", () => {
  it("renders an override in the sidebar slot and passes it the typed contract", () => {
    const seen: { activeTab: string | null } = { activeTab: "unset" };
    const { container } = render(
      <Harness
        breakpoint="desktop"
        slots={{
          sidebar: (contract) => {
            seen.activeTab = contract.activeTab;
            return <div data-testid="panel">tab:{contract.activeTab}</div>;
          },
        }}
      />,
    );
    expect(container.querySelector('[data-testid="panel"]')?.textContent).toBe("tab:fields");
    // The override received the documented SidebarContract (activeTab), not DOM.
    expect(seen.activeTab).toBe("fields");
  });

  it("routes the slot's setActiveTab through the sidebar controller", () => {
    const changed: (string | null)[] = [];
    const sidebar: SidebarState = {
      open: true,
      collapsed: false,
      activeTab: "fields",
      setOpen: () => undefined,
      toggle: () => undefined,
      collapse: () => undefined,
      setActiveTab: (tab) => {
        changed.push(tab);
      },
    };
    const layout: LayoutState = {
      visibleRegions: new Set<string>(),
      breakpoint: "desktop",
      setRegionVisible: () => undefined,
    };
    const { getByTestId } = render(
      <SidebarContext.Provider value={sidebar}>
        <LayoutContext.Provider value={layout}>
          <Sidebar
            slots={{
              sidebar: (contract) => (
                <button
                  data-testid="to-style"
                  type="button"
                  onClick={() => {
                    contract.setActiveTab("style");
                  }}
                />
              ),
            }}
          />
        </LayoutContext.Provider>
      </SidebarContext.Provider>,
    );
    act(() => {
      fireEvent.click(getByTestId("to-style"));
    });
    expect(changed).toEqual(["style"]);
  });
});

describe("DASH-T-0016 — Sidebar narrow subscription (NFR-006)", () => {
  it("re-renders on sidebar/layout changes but not on modal changes", () => {
    // A probe mirroring Shell.Sidebar's subscription (sidebar + layout only).
    const renders = { current: 0 };
    function SidebarSubscriber(): ReactNode {
      useLayoutState();
      useEffect(() => {
        renders.current += 1;
      });
      return null;
    }
    const layout: { current: LayoutState | null } = { current: null };
    const modal: { current: ReturnType<typeof useModalState> | null } = { current: null };
    function CaptureState(): ReactNode {
      const layoutValue = useLayoutState();
      const modalValue = useModalState();
      useEffect(() => {
        layout.current = layoutValue;
        modal.current = modalValue;
      });
      return null;
    }

    render(
      <AdminProvider store={fakeStore}>
        <CaptureState />
        <SidebarSubscriber />
      </AdminProvider>,
    );

    const afterMount = renders.current;
    act(() => {
      layout.current?.setRegionVisible("sidebar", true);
    });
    expect(renders.current).toBeGreaterThan(afterMount);
    const afterLayout = renders.current;

    act(() => {
      modal.current?.open("m");
    });
    expect(renders.current).toBe(afterLayout);
  });
});
