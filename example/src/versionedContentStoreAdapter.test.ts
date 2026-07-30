/**
 * Unit tests for the Versioned Content Engine reference adapter
 * (SIFR-T-0032, TC-001 op→engine mapping, TC-002 historical fidelity).
 *
 * Two concerns are proven:
 *  1. Each `HostContentOp` kind dispatches to the correct engine operation with
 *     the correct arguments (spies wrap the REAL engine, so we assert the call
 *     AND observe the real state change), and the returned snapshot reflects it.
 *  2. The `materialize` → `ContentPayload[]` transform is exact (ids, target,
 *     index, field values), and — the payoff — a version recorded before a
 *     delete still materializes the deleted item after publishing (the engine's
 *     historical-fidelity guarantee, surfaced through the adapter).
 *
 * Determinism comes from an injected `createSequenceIdStrategy` + a fixed
 * `IntegerVersionClock`, so collection ids and versions are predictable.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Wrap the real engine so every named export is a spy that still runs the real
// implementation — giving both call-argument assertions and real behavior.
vi.mock("versioned-content-engine", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("versioned-content-engine")>();
  return {
    ...actual,
    createContent: vi.fn(actual.createContent),
    updateContent: vi.fn(actual.updateContent),
    moveContent: vi.fn(actual.moveContent),
    deleteContent: vi.fn(actual.deleteContent),
    publish: vi.fn(actual.publish),
  };
});

import {
  createContent,
  updateContent,
  moveContent,
  deleteContent,
  publish,
  createSequenceIdStrategy,
  IntegerVersionClock,
} from "versioned-content-engine";
import type {
  InsertOp,
  MoveOp,
  SelectOp,
} from "@stardust-cms/iframe-adapter/host";
import type { DeleteOp, EditOp } from "@stardust-cms/dashboard";
import {
  createVersionedContentStoreAdapter,
  type VersionedContentStoreAdapter,
} from "./versionedContentStoreAdapter.js";

/** Deterministic strategies: fixed collection-id sequence + integer clock at 0. */
function build(): VersionedContentStoreAdapter {
  return createVersionedContentStoreAdapter({
    idStrategy: createSequenceIdStrategy(
      Array.from({ length: 64 }, (_, i) => `id-${i}`),
      Array.from({ length: 64 }, (_, i) => `col-${i}`),
    ),
    clock: new IntegerVersionClock(0),
  });
}

beforeEach(() => {
  vi.mocked(createContent).mockClear();
  vi.mocked(updateContent).mockClear();
  vi.mocked(moveContent).mockClear();
  vi.mocked(deleteContent).mockClear();
  vi.mocked(publish).mockClear();
});

/* -------------------------------------------------------------------------- */
/* TC-001: op → engine call mapping                                           */
/* -------------------------------------------------------------------------- */

describe("op → engine mapping (TC-001)", () => {
  it("InsertOp → createContent with target/index/type/payload; snapshot reflects it", () => {
    const adapter = build();
    const op: InsertOp = {
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "Hello" },
    };

    const snap = adapter.apply(op);

    expect(createContent).toHaveBeenCalledTimes(1);
    const args = vi.mocked(createContent).mock.calls[0]![1] as {
      target: string;
      index: number;
      type: string;
      payload: unknown;
    };
    expect(String(args.target)).toBe("hero");
    expect(args.index).toBe(0);
    expect(args.type).toBe("text");
    expect(args.payload).toEqual({ value: "Hello" });

    // First minted collection id is `col-0` → becomes the exposed contentId.
    expect(snap).toHaveLength(1);
    expect(snap[0]).toMatchObject({
      targetId: "hero",
      contentId: "col-0",
      index: 0,
      content: { id: "col-0", type: "text", value: "Hello" },
    });
  });

  it("EditOp → updateContent for the collection; snapshot shows new value", () => {
    const adapter = build();
    adapter.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "Hello" },
    });

    const edit: EditOp = {
      kind: "edit",
      targetId: "hero",
      contentId: "col-0",
      patch: { value: "Goodbye" },
    };
    const snap = adapter.apply(edit);

    expect(updateContent).toHaveBeenCalledTimes(1);
    const args = vi.mocked(updateContent).mock.calls[0]![1] as {
      collectionId: string;
      type: string;
      payload: { value?: string };
    };
    expect(String(args.collectionId)).toBe("col-0");
    expect(args.type).toBe("text");
    expect(args.payload).toMatchObject({ value: "Goodbye" });

    expect(snap.find((p) => p.contentId === "col-0")?.content.value).toBe(
      "Goodbye",
    );
  });

  it("MoveOp → moveContent with collectionId/source/dest/index; snapshot re-targets", () => {
    const adapter = build();
    adapter.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "X" },
    });

    const move: MoveOp = {
      kind: "move",
      from: { targetId: "hero", index: 0, contentId: "col-0" },
      to: { targetId: "footer", index: 0 },
    };
    const snap = adapter.apply(move);

    expect(moveContent).toHaveBeenCalledTimes(1);
    const [, args] = vi.mocked(moveContent).mock.calls[0]!;
    expect(String(args.collectionId)).toBe("col-0");
    expect(String(args.source)).toBe("hero");
    expect(String(args.dest)).toBe("footer");
    expect(args.index).toBe(0);

    const moved = snap.find((p) => p.contentId === "col-0");
    expect(moved?.targetId).toBe("footer");
  });

  it("DeleteOp → deleteContent for the collection; snapshot drops it", () => {
    const adapter = build();
    adapter.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "X" },
    });

    const del: DeleteOp = { kind: "delete", targetId: "hero", contentId: "col-0" };
    const snap = adapter.apply(del);

    expect(deleteContent).toHaveBeenCalledTimes(1);
    const [, args] = vi.mocked(deleteContent).mock.calls[0]!;
    expect(String(args.target)).toBe("hero");
    expect(String(args.collectionId)).toBe("col-0");

    expect(snap.find((p) => p.contentId === "col-0")).toBeUndefined();
  });

  it("SelectOp → no engine op; returns a fresh, unchanged snapshot", () => {
    const adapter = build();
    adapter.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "X" },
    });
    const before = adapter.getSnapshot();

    const select: SelectOp = { kind: "select", targetId: "hero", contentId: "col-0" };
    const after = adapter.apply(select);

    expect(createContent).toHaveBeenCalledTimes(1); // only the insert
    expect(updateContent).not.toHaveBeenCalled();
    expect(moveContent).not.toHaveBeenCalled();
    expect(deleteContent).not.toHaveBeenCalled();

    expect(after).toEqual(before);
    // Fresh reference each call (contract: React identity change).
    expect(after).not.toBe(before);
  });
});

/* -------------------------------------------------------------------------- */
/* Snapshot / draft-live / materializeVersion transform                       */
/* -------------------------------------------------------------------------- */

describe("snapshot transform and draft/live views", () => {
  it("getSnapshot/getDraft produce exact ContentPayload[] (id, target, index, value)", () => {
    const adapter = build();
    adapter.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "A" },
    });
    adapter.apply({
      kind: "insert",
      targetId: "hero",
      index: 1,
      payload: { type: "image", value: "b.png", styleGroup: "g1" },
    });

    const snap = adapter.getSnapshot();
    expect(snap).toEqual([
      {
        targetId: "hero",
        contentId: "col-0",
        index: 0,
        content: { id: "col-0", type: "text", value: "A" },
      },
      {
        targetId: "hero",
        contentId: "col-1",
        index: 1,
        content: { id: "col-1", type: "image", value: "b.png", styleGroup: "g1" },
      },
    ]);
    expect(adapter.getDraft?.()).toEqual(snap);
  });

  it("draft edits are invisible to getLive until publish advances live", () => {
    const adapter = build();
    adapter.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "draft-only" },
    });

    // Not yet published: live (version 0) is empty, draft shows the item.
    expect(adapter.getLive?.()).toEqual([]);
    expect(adapter.getDraft?.()).toHaveLength(1);

    const live = adapter.publish?.();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(live).toHaveLength(1);
    expect(adapter.getLive?.()).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/* TC-002: historical fidelity across a delete                                */
/* -------------------------------------------------------------------------- */

describe("historical fidelity across delete (TC-002)", () => {
  it("a version recorded before delete still materializes the deleted item after publish", () => {
    const adapter = build();

    // Create + publish so the item is live.
    adapter.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "keepsake" },
    });
    adapter.publish?.();

    // Record the live version that still contains the item.
    const preDeleteVersion = adapter.getLiveVersion();

    // Delete it and publish so live no longer contains it.
    adapter.apply({ kind: "delete", targetId: "hero", contentId: "col-0" });
    adapter.publish?.();

    // Live view: gone.
    expect(adapter.getLive?.().find((p) => p.contentId === "col-0")).toBeUndefined();

    // Historical view at the recorded version: still present (the payoff).
    const historical = adapter.materializeVersion?.(preDeleteVersion);
    const survivor = historical?.find((p) => p.contentId === "col-0");
    expect(survivor).toBeDefined();
    expect(survivor?.content.value).toBe("keepsake");
  });
});
