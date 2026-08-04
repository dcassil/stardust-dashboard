/**
 * DASH-T-0011 — admin behavior coverage gaps.
 *
 * Sidebar (open/collapse/tab) and layout (visibleRegions/breakpoint/
 * setRegionVisible) controllers, the reserved-kind guard for ALL FOUR reserved
 * kinds, and `useCommands` referential stability across unrelated re-renders.
 * (Modal-stack + overlay-mode are covered in uiState.test.tsx; command
 * when-filter/cleanup/dup-id + extension narrow-subscription in registry.test.tsx.)
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { AdminProvider } from "./AdminProvider.js";
import { useLayoutState, useSidebarState } from "./hooks.js";
import { useCommands } from "./commandRegistry.js";
import { useRegisterExtension } from "./extensionRegistry.js";
import type { LayoutState, SidebarState } from "./adminTypes.js";
import type { Command } from "./adminTypes.js";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

describe("DASH-T-0011 — sidebar controller", () => {
  it("open/close/toggle/collapse/setActiveTab drive state", () => {
    const ref: { current: SidebarState | null } = { current: null };
    function Probe(): ReactNode {
      ref.current = useSidebarState();
      return null;
    }
    render(<AdminProvider store={fakeStore}><Probe /></AdminProvider>);

    expect(ref.current).toMatchObject({ open: true, collapsed: false, activeTab: null });
    act(() => { ref.current?.setOpen(false); });
    expect(ref.current?.open).toBe(false);
    act(() => { ref.current?.toggle(); });
    expect(ref.current?.open).toBe(true);
    act(() => { ref.current?.collapse(true); });
    expect(ref.current?.collapsed).toBe(true);
    act(() => { ref.current?.setActiveTab("blocks"); });
    expect(ref.current?.activeTab).toBe("blocks");
  });
});

describe("DASH-T-0011 — layout controller", () => {
  it("setRegionVisible toggles set membership; breakpoint defaults desktop", () => {
    const ref: { current: LayoutState | null } = { current: null };
    function Probe(): ReactNode {
      ref.current = useLayoutState();
      return null;
    }
    render(<AdminProvider store={fakeStore}><Probe /></AdminProvider>);

    expect(ref.current?.breakpoint).toBe("desktop");
    expect(ref.current?.visibleRegions.has("main")).toBe(false);
    act(() => { ref.current?.setRegionVisible("main", true); });
    expect(ref.current?.visibleRegions.has("main")).toBe(true);
    act(() => { ref.current?.setRegionVisible("main", false); });
    expect(ref.current?.visibleRegions.has("main")).toBe(false);
  });
});

describe("DASH-T-0011 — reserved-kind guard for all four reserved kinds", () => {
  const reserved = ["navigation", "permissions", "currentUser", "resources"] as const;
  for (const kind of reserved) {
    it(`throws for "${kind}"`, () => {
      function Probe(): ReactNode {
        useRegisterExtension(kind, { __reserved: "not implemented this round", id: "x" });
        return null;
      }
      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      expect(() =>
        render(<AdminProvider store={fakeStore}><Probe /></AdminProvider>),
      ).toThrow(/reserved and not implemented this round/);
      spy.mockRestore();
    });
  }
});

describe("DASH-T-0011 — useCommands referential stability", () => {
  it("keeps identity across an unrelated re-render", () => {
    const ref: { current: readonly Command[] | null } = { current: null };
    function Probe(): ReactNode {
      ref.current = useCommands();
      return null;
    }
    const tree = <AdminProvider store={fakeStore}><Probe /></AdminProvider>;
    const view = render(tree);
    const before = ref.current;
    act(() => { view.rerender(tree); });
    expect(ref.current).toBe(before);
  });
});
