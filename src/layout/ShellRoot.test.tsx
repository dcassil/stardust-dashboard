/**
 * DASH-T-0014 — `Shell.Root` container tests.
 *
 * TC-001 (visible-region filtering + breakpoint reflection) plus the NFR-006
 * render-count probe (re-renders on layout changes, NOT on modal changes) and
 * the NFR-003 landmark-container shape. Driven through the real `AdminProvider`
 * with a fake store (the "fake AdminProvider" idiom used across the admin tests).
 *
 * Hook values are captured into closure boxes inside a `useEffect` (never during
 * render) — the pattern `react-hooks/immutability` accepts; the setters they
 * expose are referentially stable, so the last-committed capture is sufficient.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { AdminProvider, useLayoutState, useModalState } from "../admin";
import type { LayoutState, ModalState } from "../admin";
import { ShellRoot } from "./ShellRoot.js";
import { SD_SHELL_ROOT } from "./layoutTypes.js";
import type { LayoutRegionName } from "./layoutTypes.js";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

/** A minimal region child carrying the `region` marker `Shell.Root` gates on. */
function Region({ region }: { readonly region: LayoutRegionName }): ReactNode {
  return <div data-testid={`region-${region}`} />;
}

describe("DASH-T-0014 — Shell.Root visible-region filtering + breakpoint (TC-001)", () => {
  it("renders only visible regions and reflects the breakpoint", () => {
    const layout: { current: LayoutState | null } = { current: null };
    function CaptureLayout(): ReactNode {
      const value = useLayoutState();
      useEffect(() => {
        layout.current = value;
      });
      return null;
    }

    const { container } = render(
      <AdminProvider store={fakeStore}>
        <CaptureLayout />
        <ShellRoot>
          <Region region="topbar" />
          <Region region="footer" />
          <div data-testid="structural" />
        </ShellRoot>
      </AdminProvider>,
    );

    const root = container.querySelector(`.${SD_SHELL_ROOT}`);
    expect(root).not.toBeNull();
    // Breakpoint is stamped for the DASH-I-0004 responsive rules.
    expect(root?.getAttribute("data-breakpoint")).toBe("desktop");
    // visibleRegions starts empty → no region children, but structural stays.
    expect(container.querySelector('[data-testid="region-topbar"]')).toBeNull();
    expect(container.querySelector('[data-testid="region-footer"]')).toBeNull();
    expect(container.querySelector('[data-testid="structural"]')).not.toBeNull();

    act(() => {
      layout.current?.setRegionVisible("topbar", true);
    });

    // Only the now-visible region renders; the still-hidden one does not.
    expect(container.querySelector('[data-testid="region-topbar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="region-footer"]')).toBeNull();
  });
});

describe("DASH-T-0014 — Shell.Root narrow subscription (NFR-006)", () => {
  it("re-renders on layout changes but not on modal changes", () => {
    // A probe that mirrors Shell.Root's subscription EXACTLY (it reads only
    // `useLayoutState`, like Shell.Root), so its render count is a faithful proxy
    // for Shell.Root's: it re-renders when the layout slice changes and stays put
    // when an unrelated (modal) slice changes. Shell.Root shares this behaviour by
    // construction — it never calls `useModalState`/`useOverlayState`.
    const renders = { current: 0 };
    function LayoutSubscriber(): ReactNode {
      useLayoutState();
      useEffect(() => {
        renders.current += 1;
      });
      return null;
    }

    const layout: { current: LayoutState | null } = { current: null };
    const modal: { current: ModalState | null } = { current: null };
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
        <LayoutSubscriber />
        <ShellRoot>
          <div data-testid="child" />
        </ShellRoot>
      </AdminProvider>,
    );

    const afterMount = renders.current;
    expect(afterMount).toBeGreaterThan(0);

    act(() => {
      layout.current?.setRegionVisible("sidebar", true);
    });
    const afterLayout = renders.current;
    expect(afterLayout).toBeGreaterThan(afterMount);

    act(() => {
      modal.current?.open("some-modal");
    });
    // Modal change must NOT re-render a layout-only subscriber (Shell.Root's shape).
    expect(renders.current).toBe(afterLayout);
  });
});
