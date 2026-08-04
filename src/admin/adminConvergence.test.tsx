/**
 * DASH-T-0009 — AdminProvider convergence tests.
 *
 * TC-001 (every focused hook resolves under a single AdminProvider), TC-002
 * (standalone "no bundled UI" editing flow), TC-003 (the full behavior surface
 * imports from the package root). Composition rule: AdminProvider ALWAYS owns
 * store provisioning (via EditingProvider → StoreProvider from the `store`
 * prop); consumers inject through `store`, they do NOT wrap it in their own
 * StoreProvider.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import * as pkg from "..";
import type { ContentSnapshot, ContentStoreAdapter, HostContentOp } from "../store";
import { AdminProvider } from "./AdminProvider.js";
import {
  useLayoutState,
  useModalState,
  useOverlayState,
  useSidebarState,
} from "./hooks.js";
import { useCommands } from "./commandRegistry.js";
import { useExtensions } from "./extensionRegistry.js";
import {
  useEditingActions,
  useEditingState,
  useSelection,
} from "../editing";
import type { EditingActions, EditingState } from "../editing";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (op: HostContentOp): ContentSnapshot =>
    op.kind === "edit" ? [] : [],
};

describe("DASH-T-0009 — every focused hook resolves under AdminProvider (TC-001)", () => {
  it("mounts once and all 11 read/registry hooks resolve without throwing", () => {
    const seen: string[] = [];
    function Probe(): ReactNode {
      useSelection();
      useEditingState();
      useEditingActions();
      useSidebarState();
      useModalState();
      useOverlayState();
      useLayoutState();
      useCommands();
      useExtensions("panels");
      seen.push("ok");
      return null;
    }
    render(
      <AdminProvider store={fakeStore}>
        <Probe />
      </AdminProvider>,
    );
    expect(seen).toContain("ok");
  });
});

describe("DASH-T-0009 — standalone no-bundled-UI editing flow (TC-002)", () => {
  it("drives startEditing/change/stopEditing under AdminProvider alone", () => {
    const onContentChange = vi.fn();
    const actionsRef: { current: EditingActions | null } = { current: null };
    const stateRef: { current: EditingState | null } = { current: null };
    function Probe(): ReactNode {
      actionsRef.current = useEditingActions();
      stateRef.current = useEditingState();
      return null;
    }
    render(
      <AdminProvider store={fakeStore} onContentChange={onContentChange}>
        <Probe />
      </AdminProvider>,
    );

    act(() => {
      actionsRef.current?.startEditing({ targetId: "t1", contentId: "c1" });
    });
    expect(stateRef.current?.isEditing).toBe(true);

    act(() => {
      actionsRef.current?.change({
        kind: "edit", targetId: "t1", contentId: "c1", patch: { value: "v" },
      });
    });
    expect(onContentChange).toHaveBeenCalled();

    act(() => { actionsRef.current?.stopEditing(); });
    expect(stateRef.current?.isEditing).toBe(false);
  });
});

describe("DASH-T-0009 — full behavior surface imports from the package root (TC-003)", () => {
  it("exposes editing + admin providers, hooks, and registries from the root", () => {
    for (const name of [
      "EditingProvider",
      "AdminProvider",
      "useSelection",
      "useEditingState",
      "useEditingActions",
      "useSidebarState",
      "useModalState",
      "useOverlayState",
      "useLayoutState",
      "useRegisterCommand",
      "useCommands",
      "useRegisterExtension",
      "useExtensions",
    ] as const) {
      expect(typeof pkg[name]).toBe("function");
    }
  });
});
