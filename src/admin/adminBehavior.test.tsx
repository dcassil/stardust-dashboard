/**
 * DASH-T-0001 spike smoke test — proves the FROZEN public surface is importable,
 * named as locked, and that mounting `<AdminProvider>` yields hooks returning
 * values of the frozen shapes without throwing.
 *
 * TC-001 (public surface importable + named) and TC-002 (provider composition +
 * hooks return frozen shapes) from the task map onto the two suites below. This
 * asserts the CONTRACT (names/shapes/composition), not the real behavior — which
 * is deliberately skeleton until DASH-T-0003+.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";

// Import every FROZEN public identifier from the PACKAGE ROOT — this is the
// surface downstream designs against (TC-001).
import {
  AdminProvider,
  EditingProvider,
  useSelection,
  useEditingState,
  useEditingActions,
  useSidebarState,
  useModalState,
  useOverlayState,
  useLayoutState,
} from "..";
import type {
  AdminProviderProps,
  EditingRef,
  EditingActions,
  SelectionState,
  EditingState,
  OverlayState,
  OverlayMode,
  SidebarState,
  ModalState,
  LayoutState,
} from "..";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store/adapter.js";

/* -------------------------------------------------------------------------- */
/* Fake store — no concrete store imported (NFR-001)                          */
/* -------------------------------------------------------------------------- */

function makeFakeStore(): { store: ContentStoreAdapter; applied: HostContentOp[] } {
  const snapshot: ContentSnapshot = [];
  const applied: HostContentOp[] = [];
  const store: ContentStoreAdapter = {
    getSnapshot: () => snapshot,
    apply: (op: HostContentOp) => {
      applied.push(op);
      return snapshot;
    },
  };
  return { store, applied };
}

/* -------------------------------------------------------------------------- */
/* Probe — calls every frozen hook and records the returned values            */
/* -------------------------------------------------------------------------- */

interface ProbeCapture {
  selection?: SelectionState;
  editing?: EditingState;
  actions?: EditingActions;
  sidebar?: SidebarState;
  modal?: ModalState;
  overlay?: OverlayState;
  layout?: LayoutState;
}

/**
 * Mount `<AdminProvider store>` with a probe that calls every frozen hook,
 * writing results into a closure-scoped capture object (not a prop, so the
 * `react-hooks/immutability` rule is satisfied) that the caller then asserts on.
 */
function mountProbe(store: ContentStoreAdapter): ProbeCapture {
  const capture: ProbeCapture = {};
  function Probe(): ReactNode {
    capture.selection = useSelection();
    capture.editing = useEditingState();
    capture.actions = useEditingActions();
    capture.sidebar = useSidebarState();
    capture.modal = useModalState();
    capture.overlay = useOverlayState();
    capture.layout = useLayoutState();
    return null;
  }
  render(
    <AdminProvider store={store}>
      <Probe />
    </AdminProvider>,
  );
  return capture;
}

afterEach(cleanup);

describe("DASH-T-0001 — frozen public surface (TC-001)", () => {
  it("exports the locked component + hook identifiers from the package root", () => {
    for (const fn of [
      AdminProvider,
      EditingProvider,
      useSelection,
      useEditingState,
      useEditingActions,
      useSidebarState,
      useModalState,
      useOverlayState,
      useLayoutState,
    ]) {
      expect(typeof fn).toBe("function");
    }
  });

  it("type-only imports of the frozen shapes compile", () => {
    // Compile-time assertions: constructing values of the frozen types proves
    // their exported names + shapes. (No runtime behavior asserted here.)
    const ref: EditingRef = { targetId: "t1", contentId: "c1" };
    const mode: OverlayMode = "edit";
    const props: Pick<AdminProviderProps, "store"> = {
      store: makeFakeStore().store,
    };
    expect(ref.targetId).toBe("t1");
    expect(mode).toBe("edit");
    expect(props.store).toBeDefined();
  });
});

describe("DASH-T-0001 — provider composition + frozen hook shapes (TC-002)", () => {
  it("mounts <AdminProvider store> and every hook returns its frozen shape", () => {
    const { store } = makeFakeStore();
    const capture = mountProbe(store);

    // Selection slice
    expect(capture.selection).toMatchObject({
      selectedTargetId: null,
      selectedContentId: null,
      selectedRef: null,
    });
    // Editing session slice defaults to idle
    expect(capture.editing).toMatchObject({
      isEditing: false,
      editingRef: null,
    });
    // Actions are a stable object of the frozen REQ-004 method set
    expect(Object.keys(capture.actions ?? {}).sort()).toEqual(
      ["add", "change", "move", "remove", "select", "startEditing", "stopEditing"].sort(),
    );
    // Overlay owns the frozen edit|preview mode, defaulting to "edit"
    expect(capture.overlay?.mode).toBe("edit");
    expect(capture.overlay?.activeLayer).toBeNull();
    expect(typeof capture.overlay?.setMode).toBe("function");
    // Sidebar / modal / layout frozen shapes (REQ-010)
    expect(typeof capture.sidebar?.open).toBe("boolean");
    expect(typeof capture.sidebar?.collapsed).toBe("boolean");
    expect(capture.modal?.stack).toEqual([]);
    expect(capture.layout?.breakpoint).toBe("desktop");
    expect(capture.layout?.visibleRegions).toBeInstanceOf(Set);
  });

  it("select() routes a select op through the injected store (single entry point)", () => {
    const { store, applied } = makeFakeStore();
    const capture = mountProbe(store);

    act(() => {
      capture.actions?.select({ targetId: "t1", contentId: "c1" });
    });

    expect(applied).toEqual([{ kind: "select", targetId: "t1", contentId: "c1" }]);
    expect(capture.selection?.selectedTargetId).toBe("t1");
    expect(capture.selection?.selectedContentId).toBe("c1");
  });
});
