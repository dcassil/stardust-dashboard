/**
 * Tests for the store seam (SIFR-T-0031).
 *
 * Strategy: build a FAKE `ContentStoreAdapter` entirely in-test (no concrete
 * store imported), then assert:
 *  - `dispatchStoreOp` and the fake apply route each op kind correctly;
 *  - `StoreProvider` + `useContentStore` wire `apply(op) → adapter → new
 *    snapshot`, keeping the returned snapshot flowing to the (re-injection) caller;
 *  - the editing tree needs only a `ContentStoreAdapter` — no concrete store type
 *    ever appears (this file imports nothing but the public seam + published ops).
 *
 * TC-001 (apply routes each op) and TC-002 (context injection is store-agnostic)
 * from the task map onto the suites below.
 */

import type { ReactElement } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  InsertOp,
  MoveOp,
  SelectOp,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import {
  dispatchStoreOp,
  type ContentSnapshot,
  type ContentStoreAdapter,
  type DeleteOp,
  type EditOp,
  type HostContentOp,
} from "./adapter.js";
import { StoreProvider, useContentStore } from "./StoreProvider.js";

/* -------------------------------------------------------------------------- */
/* A minimal in-test fake ContentStoreAdapter                                 */
/* -------------------------------------------------------------------------- */

function payload(
  targetId: string,
  index: number,
  id: string,
  value: string,
): ContentPayload {
  return { targetId, contentId: id, index, content: { id, type: "text", value } };
}

/**
 * A tiny mutable-projection fake. It records every op it receives and mutates an
 * internal list so we can assert each op kind produced the right next snapshot.
 * Every returned snapshot is a fresh array (identity changes), as the contract
 * requires. Not a real store — deliberately trivial, in-test only.
 */
function createFakeAdapter(seed: ContentPayload[] = []): {
  adapter: ContentStoreAdapter;
  received: HostContentOp[];
} {
  let items: ContentPayload[] = [...seed];
  const received: HostContentOp[] = [];

  const snap = (): ContentSnapshot => items.map((p) => ({ ...p }));

  const adapter: ContentStoreAdapter = {
    getSnapshot: () => snap(),
    apply(op: HostContentOp): ContentSnapshot {
      received.push(op);
      switch (op.kind) {
        case "insert":
          items = [
            ...items,
            payload(op.targetId, op.index, `new-${op.index}`, String(op.payload.type)),
          ];
          break;
        case "move": {
          const moved = items.find((p) => p.contentId === op.from.contentId);
          if (moved) {
            items = items.map((p) =>
              p.contentId === moved.contentId
                ? { ...p, targetId: op.to.targetId, index: op.to.index }
                : p,
            );
          }
          break;
        }
        case "delete":
          items = items.filter((p) => p.contentId !== op.contentId);
          break;
        case "edit":
          items = items.map((p) =>
            p.contentId === op.contentId
              ? { ...p, content: { ...p.content, ...op.patch } }
              : p,
          );
          break;
        case "select":
          // Selection mutates nothing.
          break;
      }
      return snap();
    },
  };

  return { adapter, received };
}

/* -------------------------------------------------------------------------- */
/* TC-001: apply() routes each op                                             */
/* -------------------------------------------------------------------------- */

describe("ContentStoreAdapter.apply / dispatchStoreOp routing (TC-001)", () => {
  it("routes insert, move, delete, edit, select and returns fresh snapshots", () => {
    const seed = [payload("hero", 0, "a", "A"), payload("hero", 1, "b", "B")];
    const { adapter, received } = createFakeAdapter(seed);

    const before = adapter.getSnapshot();

    const insert: InsertOp = {
      kind: "insert",
      targetId: "hero",
      index: 2,
      payload: { type: "text" },
    };
    const afterInsert = adapter.apply(insert);
    expect(afterInsert).toHaveLength(3);
    // Prior snapshot reference is not mutated.
    expect(before).toHaveLength(2);
    expect(afterInsert).not.toBe(before);

    const move: MoveOp = {
      kind: "move",
      from: { targetId: "hero", index: 0, contentId: "a" },
      to: { targetId: "hero", index: 5 },
    };
    const afterMove = adapter.apply(move);
    expect(afterMove.find((p) => p.contentId === "a")?.index).toBe(5);

    const edit: EditOp = {
      kind: "edit",
      targetId: "hero",
      contentId: "b",
      patch: { value: "edited" },
    };
    const afterEdit = adapter.apply(edit);
    expect(afterEdit.find((p) => p.contentId === "b")?.content.value).toBe("edited");

    const del: DeleteOp = { kind: "delete", targetId: "hero", contentId: "b" };
    const afterDelete = adapter.apply(del);
    expect(afterDelete.find((p) => p.contentId === "b")).toBeUndefined();

    const select: SelectOp = { kind: "select", targetId: "hero", contentId: "a" };
    const afterSelect = adapter.apply(select);
    // select is a no-op on content: same length, fresh reference.
    expect(afterSelect).toHaveLength(afterDelete.length);
    expect(afterSelect).not.toBe(afterDelete);

    expect(received.map((o) => o.kind)).toEqual([
      "insert",
      "move",
      "edit",
      "delete",
      "select",
    ]);
  });

  it("dispatchStoreOp forwards a real op and returns current snapshot for null", () => {
    const { adapter, received } = createFakeAdapter([payload("t", 0, "x", "X")]);

    const insert: InsertOp = {
      kind: "insert",
      targetId: "t",
      index: 1,
      payload: { type: "text" },
    };
    const next = dispatchStoreOp(adapter, insert);
    expect(next).toHaveLength(2);
    expect(received).toHaveLength(1);

    const noop = dispatchStoreOp(adapter, null);
    expect(noop).toHaveLength(2); // current snapshot, unchanged
    expect(received).toHaveLength(1); // apply not called again
  });
});

/* -------------------------------------------------------------------------- */
/* TC-002: context injection is store-agnostic                               */
/* -------------------------------------------------------------------------- */

/** Captures the store binding out of the React tree for assertions. */
function StoreProbe({
  onReady,
}: {
  onReady: (v: ReturnType<typeof useContentStore>) => void;
}): null {
  onReady(useContentStore());
  return null;
}

describe("StoreProvider + useContentStore injection (TC-002)", () => {
  afterEach(() => cleanup());

  it("seeds the snapshot from the injected adapter", () => {
    const { adapter } = createFakeAdapter([payload("hero", 0, "a", "A")]);
    let binding: ReturnType<typeof useContentStore> | undefined;

    render(
      <StoreProvider store={adapter}>
        <StoreProbe onReady={(v) => (binding = v)} />
      </StoreProvider>,
    );

    expect(binding?.snapshot).toHaveLength(1);
    expect(binding?.store).toBe(adapter);
  });

  it("apply(op) calls adapter.apply once with the built op and surfaces the new snapshot", () => {
    const { adapter } = createFakeAdapter([payload("hero", 0, "a", "A")]);
    const applySpy = vi.spyOn(adapter, "apply");
    let binding: ReturnType<typeof useContentStore> | undefined;

    render(
      <StoreProvider store={adapter}>
        <StoreProbe onReady={(v) => (binding = v)} />
      </StoreProvider>,
    );

    const insert: InsertOp = {
      kind: "insert",
      targetId: "hero",
      index: 1,
      payload: { type: "text" },
    };

    let returned: ContentSnapshot | undefined;
    act(() => {
      returned = binding?.apply(insert);
    });

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith(insert);
    // Returned snapshot flows back to the caller (for re-injection)...
    expect(returned).toHaveLength(2);
    // ...and the same snapshot is surfaced on the context for consumers.
    expect(binding?.snapshot).toHaveLength(2);
  });

  it("re-seeds when a different adapter instance is injected", () => {
    const first = createFakeAdapter([payload("hero", 0, "a", "A")]);
    const second = createFakeAdapter([
      payload("hero", 0, "x", "X"),
      payload("hero", 1, "y", "Y"),
    ]);
    let binding: ReturnType<typeof useContentStore> | undefined;

    const tree = (adapter: ContentStoreAdapter): ReactElement => (
      <StoreProvider store={adapter}>
        <StoreProbe onReady={(v) => (binding = v)} />
      </StoreProvider>
    );

    const { rerender } = render(tree(first.adapter));
    expect(binding?.snapshot).toHaveLength(1);

    rerender(tree(second.adapter));
    expect(binding?.snapshot).toHaveLength(2);
    expect(binding?.store).toBe(second.adapter);
  });

  it("useContentStore throws when used without a provider", () => {
    // Rendering a probe without a StoreProvider must throw loudly.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StoreProbe onReady={() => {}} />)).toThrow(
      /StoreProvider/,
    );
    spy.mockRestore();
  });
});
