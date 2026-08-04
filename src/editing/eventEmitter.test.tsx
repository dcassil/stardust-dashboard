/**
 * DASH-T-0004 — post-commit event emitter tests.
 *
 * TC-001 (post-commit, once-per-action emission with correct payload),
 * TC-002 (`add` fires onInsert + onContentChange + onSelect, once each),
 * TC-003 (no render-phase emission), plus a pure test of `flushEditingEvents`.
 * Callbacks are vitest spies; a fake `ContentStoreAdapter` backs the tree.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type { ContentSnapshot, ContentStoreAdapter, HostContentOp } from "../store";
import { EditingProvider } from "./EditingProvider.js";
import { useEditingActions } from "./hooks.js";
import { flushEditingEvents } from "./eventEmitter.js";
import type { EditingActions } from "./editingTypes.js";

afterEach(cleanup);

function makeStore(): ContentStoreAdapter {
  let snapshot: ContentSnapshot = [];
  return {
    getSnapshot: () => snapshot,
    apply: (op: HostContentOp): ContentSnapshot => {
      if (op.kind === "insert") {
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
}

interface Spies {
  onSelect: ReturnType<typeof vi.fn>;
  onInsert: ReturnType<typeof vi.fn>;
  onContentChange: ReturnType<typeof vi.fn>;
  onEditingStart: ReturnType<typeof vi.fn>;
  onEditingStop: ReturnType<typeof vi.fn>;
}

function mount(): { actions: () => EditingActions | null; spies: Spies } {
  const spies: Spies = {
    onSelect: vi.fn(),
    onInsert: vi.fn(),
    onContentChange: vi.fn(),
    onEditingStart: vi.fn(),
    onEditingStop: vi.fn(),
  };
  const ref: { current: EditingActions | null } = { current: null };
  function Probe(): ReactNode {
    ref.current = useEditingActions();
    return null;
  }
  render(
    <EditingProvider store={makeStore()} {...spies}>
      <Probe />
    </EditingProvider>,
  );
  return { actions: () => ref.current, spies };
}

describe("DASH-T-0004 — once-per-action, post-commit emission (TC-001)", () => {
  it("change fires only onContentChange, once, with the fresh snapshot", () => {
    const { actions, spies } = mount();
    act(() => {
      actions()?.change({ kind: "edit", targetId: "t1", contentId: "c1", patch: { value: "x" } });
    });
    expect(spies.onContentChange).toHaveBeenCalledTimes(1);
    expect(spies.onContentChange.mock.calls[0]?.[0]).toBeInstanceOf(Array);
    expect(spies.onInsert).not.toHaveBeenCalled();
    expect(spies.onSelect).not.toHaveBeenCalled();
  });
});

describe("DASH-T-0004 — add fires the full event set once each (TC-002)", () => {
  it("onInsert + onContentChange + onSelect each fire exactly once", () => {
    const { actions, spies } = mount();
    act(() => {
      actions()?.add({ kind: "insert", targetId: "t1", index: 0, payload: { type: "text" } });
    });
    expect(spies.onInsert).toHaveBeenCalledTimes(1);
    expect(spies.onContentChange).toHaveBeenCalledTimes(1);
    expect(spies.onSelect).toHaveBeenCalledTimes(1);
    // auto-select carried the inserted item's id
    expect(spies.onSelect.mock.calls[0]?.[0]).toMatchObject({ contentId: "c-new" });
  });

  it("startEditing fires onSelect + onEditingStart once each", () => {
    const { actions, spies } = mount();
    act(() => {
      actions()?.startEditing({ targetId: "t1", contentId: "c1" });
    });
    expect(spies.onSelect).toHaveBeenCalledTimes(1);
    expect(spies.onEditingStart).toHaveBeenCalledTimes(1);
    expect(spies.onEditingStop).not.toHaveBeenCalled();
  });
});

describe("DASH-T-0004 — no render-phase emission (TC-003)", () => {
  it("does not fire any callback merely from mounting (no action yet)", () => {
    const { spies } = mount();
    for (const spy of Object.values(spies)) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});

describe("DASH-T-0004 — flushEditingEvents is pure + order-preserving", () => {
  it("dispatches queued events in order to the matching callbacks", () => {
    const calls: string[] = [];
    flushEditingEvents(
      [
        { type: "insert", op: { kind: "insert", targetId: "t", index: 0, payload: { type: "text" } } },
        { type: "contentChange", snapshot: [] },
      ],
      {
        onInsert: () => calls.push("insert"),
        onContentChange: () => calls.push("contentChange"),
      },
    );
    expect(calls).toEqual(["insert", "contentChange"]);
  });
});
