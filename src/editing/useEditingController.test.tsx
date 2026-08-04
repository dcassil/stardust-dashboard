/**
 * DASH-T-0003 — editing controller state-machine tests.
 *
 * TC-001 (each action maps to the correct store op per the mapping table),
 * TC-002 (auto-select-on-add incl. the not-found no-op), TC-003 (referential
 * stability of the actions object). Driven by a fake `ContentStoreAdapter` with
 * a spy on `apply` — no concrete store imported (NFR-001).
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import { StoreProvider } from "../store";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store";
import { useEditingController, type EditingController } from "./useEditingController.js";

afterEach(cleanup);

interface FakeStore {
  store: ContentStoreAdapter;
  applied: HostContentOp[];
}

/** A fake adapter. `insert` appends an item at (targetId,index) unless muted. */
function makeStore(insertReturnsItem = true): FakeStore {
  let snapshot: ContentSnapshot = [];
  const applied: HostContentOp[] = [];
  const store: ContentStoreAdapter = {
    getSnapshot: () => snapshot,
    apply: (op: HostContentOp): ContentSnapshot => {
      applied.push(op);
      if (op.kind === "insert" && insertReturnsItem) {
        const payload: ContentPayload = {
          targetId: op.targetId,
          contentId: "c-new",
          index: op.index,
          content: { id: "c-new", type: "text" },
        };
        snapshot = [...snapshot, payload];
      } else if (op.kind !== "select") {
        snapshot = [...snapshot];
      }
      return snapshot;
    },
  };
  return { store, applied };
}

/** Mount the controller inside a StoreProvider; expose the latest instance. */
function mountController(store: ContentStoreAdapter): {
  ref: { current: EditingController | null };
  rerender: () => void;
} {
  const ref: { current: EditingController | null } = { current: null };
  function Probe(): ReactNode {
    ref.current = useEditingController();
    return null;
  }
  const tree = (
    <StoreProvider store={store}>
      <Probe />
    </StoreProvider>
  );
  const result = render(tree);
  return { ref, rerender: () => { result.rerender(tree); } };
}

const kinds = (applied: HostContentOp[]): string[] => applied.map((o) => o.kind);

describe("DASH-T-0003 — action → store-op mapping (TC-001)", () => {
  it("select dispatches an inert select op", () => {
    const { store, applied } = makeStore();
    const { ref } = mountController(store);
    act(() => { ref.current?.actions.select({ targetId: "t1", contentId: "c1" }); });
    expect(kinds(applied)).toEqual(["select"]);
  });

  it("startEditing dispatches an inert select op (session set, no content op)", () => {
    const { store, applied } = makeStore();
    const { ref } = mountController(store);
    act(() => { ref.current?.actions.startEditing({ targetId: "t1", contentId: "c1" }); });
    expect(kinds(applied)).toEqual(["select"]);
    expect(ref.current?.editing).toMatchObject({ isEditing: true });
  });

  it("stopEditing dispatches NO op and clears the session", () => {
    const { store, applied } = makeStore();
    const { ref } = mountController(store);
    act(() => { ref.current?.actions.startEditing({ targetId: "t1", contentId: "c1" }); });
    applied.length = 0;
    act(() => { ref.current?.actions.stopEditing(); });
    expect(applied).toEqual([]);
    expect(ref.current?.editing).toMatchObject({ isEditing: false, editingRef: null });
  });

  it("add maps to insert then auto-selects the inserted item", () => {
    const add = makeStore();
    const addCtl = mountController(add.store);
    act(() => {
      addCtl.ref.current?.actions.add({
        kind: "insert", targetId: "t1", index: 0, payload: { type: "text" },
      });
    });
    expect(kinds(add.applied)).toEqual(["insert", "select"]);
  });

  it("remove maps to a delete op", () => {
    const rem = makeStore();
    const remCtl = mountController(rem.store);
    act(() => {
      remCtl.ref.current?.actions.remove({
        kind: "delete", targetId: "t1", contentId: "c1",
      });
    });
    expect(kinds(rem.applied)).toEqual(["delete"]);
  });

  it("move maps to a move op", () => {
    const mov = makeStore();
    const movCtl = mountController(mov.store);
    act(() => {
      movCtl.ref.current?.actions.move({
        kind: "move", from: { targetId: "t1", index: 0 }, to: { targetId: "t1", index: 1 },
      });
    });
    expect(kinds(mov.applied)).toEqual(["move"]);
  });

  it("change maps to an edit op", () => {
    const chg = makeStore();
    const chgCtl = mountController(chg.store);
    act(() => {
      chgCtl.ref.current?.actions.change({
        kind: "edit", targetId: "t1", contentId: "c1", patch: { value: "x" },
      });
    });
    expect(kinds(chg.applied)).toEqual(["edit"]);
  });
});

describe("DASH-T-0003 — auto-select on add (TC-002)", () => {
  it("selects the inserted item when the store surfaces it", () => {
    const { store } = makeStore(true);
    const { ref } = mountController(store);
    act(() => {
      ref.current?.actions.add({
        kind: "insert", targetId: "t1", index: 0, payload: { type: "text" },
      });
    });
    expect(ref.current?.selection.selectedContentId).toBe("c-new");
    expect(ref.current?.selection.selectedTargetId).toBe("t1");
  });

  it("leaves selection unchanged when the item is not found (no-op)", () => {
    const { store } = makeStore(false);
    const { ref } = mountController(store);
    act(() => {
      ref.current?.actions.add({
        kind: "insert", targetId: "t1", index: 0, payload: { type: "text" },
      });
    });
    expect(ref.current?.selection.selectedContentId).toBeNull();
    expect(ref.current?.selection.selectedTargetId).toBeNull();
  });
});

describe("DASH-T-0003 — referential stability (TC-003)", () => {
  it("keeps the actions object identity across an unrelated re-render", () => {
    const { store } = makeStore();
    const { ref, rerender } = mountController(store);
    const before = ref.current?.actions;
    act(() => { rerender(); });
    expect(ref.current?.actions).toBe(before);
  });
});
