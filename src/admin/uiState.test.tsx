/**
 * DASH-T-0007 — shared UI-state controller tests, driven through AdminProvider
 * (which mounts the controller) with a fake store.
 *
 * TC-001 (modal stack push/pop/targeted-close), TC-002 (overlay owns the
 * edit|preview mode), TC-003 (narrow subscription: a sidebar-only consumer does
 * NOT re-render on an overlay-mode change — NFR-005).
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { AdminProvider } from "./AdminProvider.js";
import {
  useModalState,
  useOverlayState,
  useSidebarState,
} from "./hooks.js";
import type { ModalState, OverlayState } from "./adminTypes.js";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

describe("DASH-T-0007 — modal stack semantics (TC-001)", () => {
  it("push, targeted close, and pop-top behave as a stack", () => {
    const ref: { current: ModalState | null } = { current: null };
    function Probe(): ReactNode {
      ref.current = useModalState();
      return null;
    }
    render(
      <AdminProvider store={fakeStore}>
        <Probe />
      </AdminProvider>,
    );

    act(() => {
      ref.current?.open("a");
      ref.current?.open("b", { x: 1 });
    });
    expect(ref.current?.stack.map((e) => e.id)).toEqual(["a", "b"]);
    expect(ref.current?.isOpen("a")).toBe(true);

    act(() => { ref.current?.close(); });
    expect(ref.current?.stack.map((e) => e.id)).toEqual(["a"]);

    act(() => { ref.current?.close("a"); });
    expect(ref.current?.stack).toEqual([]);
    expect(ref.current?.isOpen("a")).toBe(false);
  });
});

describe("DASH-T-0007 — overlay owns edit|preview mode (TC-002)", () => {
  it("defaults to edit and moves to preview via setMode", () => {
    const ref: { current: OverlayState | null } = { current: null };
    function Probe(): ReactNode {
      ref.current = useOverlayState();
      return null;
    }
    render(
      <AdminProvider store={fakeStore}>
        <Probe />
      </AdminProvider>,
    );
    expect(ref.current?.mode).toBe("edit");
    act(() => { ref.current?.setMode("preview"); });
    expect(ref.current?.mode).toBe("preview");
  });
});

describe("DASH-T-0007 — narrow subscription across slices (TC-003)", () => {
  it("a sidebar-only consumer does not re-render on an overlay-mode change", () => {
    let sidebarRenders = 0;
    const overlayRef: { current: OverlayState | null } = { current: null };
    function SidebarProbe(): ReactNode {
      useSidebarState();
      sidebarRenders += 1;
      return null;
    }
    function OverlayProbe(): ReactNode {
      overlayRef.current = useOverlayState();
      return null;
    }
    render(
      <AdminProvider store={fakeStore}>
        <SidebarProbe />
        <OverlayProbe />
      </AdminProvider>,
    );
    const before = sidebarRenders;
    act(() => { overlayRef.current?.setMode("preview"); });
    expect(sidebarRenders).toBe(before);
  });
});
