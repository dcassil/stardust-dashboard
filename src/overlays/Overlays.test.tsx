/**
 * Tests for the overridable overlay chrome (SIFR-T-0035).
 *
 * Strategy — real primitives, fake store, no iframe/transport:
 *  - render {@link Overlays} inside a {@link StoreProvider} backed by a FAKE
 *    `ContentStoreAdapter` (built in-test, no concrete store imported), over a
 *    hand-built `MappedTarget[]` (no `useStardustHost`, no jsdom geometry);
 *  - the published `TargetAreaOverlay`/`ContentItemOverlay` primitives are used
 *    UNMOCKED — they render plain divs — so the test also proves the wrapper
 *    layers chrome over, never modifies, them;
 *  - assert: the default chrome is a delete button that dispatches a `DeleteOp`;
 *    a `renderItemChrome` override replaces it (and its `onDelete` still emits a
 *    `DeleteOp`); class-name overrides land on the expected elements; clicking an
 *    item dispatches a `SelectOp`.
 *
 * TC-001 (chrome slot override + store delete path) from the task maps here.
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  DATA_TRANSFER_KEYS,
  type MappedChild,
  type MappedTarget,
} from "@stardust-cms/iframe-adapter/host";
import { StoreProvider } from "../store/StoreProvider.js";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store/adapter.js";
import { Overlays } from "./Overlays.js";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

function mappedChild(contentId: string, index: number): MappedChild {
  return {
    contentId,
    index,
    isContainer: false,
    styleGroup: "default",
    geometry: { top: 10 * index, left: 0, width: 100, height: 20 },
  };
}

function mappedTarget(targetId: string, children: MappedChild[]): MappedTarget {
  return {
    targetId,
    isContainer: false,
    geometry: { top: 0, left: 0, width: 100, height: 100 },
    children,
  };
}

/** A fake adapter that records every op and returns a fresh empty snapshot. */
function createRecordingAdapter(): {
  adapter: ContentStoreAdapter;
  ops: HostContentOp[];
} {
  const ops: HostContentOp[] = [];
  const adapter: ContentStoreAdapter = {
    getSnapshot(): ContentSnapshot {
      return [];
    },
    apply(op: HostContentOp): ContentSnapshot {
      ops.push(op);
      return [];
    },
  };
  return { adapter, ops };
}

function renderOverlays(
  ui: ReactNode,
): { ops: HostContentOp[]; container: HTMLElement } {
  const { adapter, ops } = createRecordingAdapter();
  const { container } = render(<StoreProvider store={adapter}>{ui}</StoreProvider>);
  return { ops, container };
}

const TARGETS: MappedTarget[] = [
  mappedTarget("t1", [mappedChild("c1", 0), mappedChild("c2", 1)]),
];

// A "no callbacks" host bundle (drag/drop select is handled through the store).
const NO_CALLBACKS = {};

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

afterEach(cleanup);

describe("Overlays default chrome", () => {
  it("renders a delete button per item that dispatches a DeleteOp", () => {
    const { ops, container } = renderOverlays(
      <Overlays targets={TARGETS} callbacks={NO_CALLBACKS} />,
    );

    const deletes = container.querySelectorAll<HTMLButtonElement>(".ov-delete");
    expect(deletes).toHaveLength(2);

    fireEvent.click(deletes[0]!);
    expect(ops).toEqual([
      { kind: "delete", targetId: "t1", contentId: "c1" },
    ]);
  });

  it("omits the delete button when showDeleteButton is false", () => {
    const { container } = renderOverlays(
      <Overlays
        targets={TARGETS}
        callbacks={NO_CALLBACKS}
        showDeleteButton={false}
      />,
    );
    expect(container.querySelectorAll(".ov-delete")).toHaveLength(0);
  });
});

describe("Overlays renderItemChrome override", () => {
  it("replaces the default chrome and still routes delete through the store", () => {
    const { ops, container } = renderOverlays(
      <Overlays
        targets={TARGETS}
        callbacks={NO_CALLBACKS}
        renderItemChrome={(child, targetId, { onDelete }) => (
          <button
            type="button"
            data-testid={`custom-${child.contentId}`}
            data-target={targetId}
            onClick={onDelete}
          >
            remove
          </button>
        )}
      />,
    );

    // Default chrome is gone…
    expect(container.querySelectorAll(".ov-delete")).toHaveLength(0);
    // …replaced by the custom control.
    const custom = container.querySelector<HTMLButtonElement>(
      '[data-testid="custom-c2"]',
    );
    expect(custom).not.toBeNull();
    expect(custom!.getAttribute("data-target")).toBe("t1");

    // The custom control's onDelete still emits a store DeleteOp.
    fireEvent.click(custom!);
    expect(ops).toEqual([
      { kind: "delete", targetId: "t1", contentId: "c2" },
    ]);
  });
});

describe("Overlays class-name overrides", () => {
  it("applies overridden class names to the target, item, and group", () => {
    const { container } = renderOverlays(
      <Overlays
        targets={TARGETS}
        callbacks={NO_CALLBACKS}
        groupClassName="my-group"
        targetClassName="my-target"
        itemClassName="my-item"
      />,
    );
    expect(container.querySelector(".my-group")).not.toBeNull();
    expect(container.querySelector(".my-target")).not.toBeNull();
    expect(container.querySelectorAll(".my-item")).toHaveLength(2);
    // Defaults are no longer emitted for the overridden regions.
    expect(container.querySelector(".ov-target")).toBeNull();
    expect(container.querySelector(".ov-item")).toBeNull();
  });

  it("applies the selected class to the selected item", () => {
    const { container } = renderOverlays(
      <Overlays
        targets={TARGETS}
        callbacks={NO_CALLBACKS}
        selectedContentId="c2"
        selectedItemClassName="is-selected"
      />,
    );
    const selected = container.querySelectorAll(".is-selected");
    expect(selected).toHaveLength(1);
    expect(selected[0]!.getAttribute("data-content-id")).toBe("c2");
  });
});

describe("Overlays read-only (editable=false)", () => {
  it("renders no delete button and does not dispatch select on item click", () => {
    const { ops, container } = renderOverlays(
      <Overlays targets={TARGETS} callbacks={NO_CALLBACKS} editable={false} />,
    );

    // No delete chrome at all.
    expect(container.querySelectorAll(".ov-delete")).toHaveLength(0);

    // The geometry boxes still render (read-only viewing is unaffected)...
    const item = container.querySelector<HTMLElement>(
      '.ov-item[data-content-id="c1"]',
    );
    expect(item).not.toBeNull();

    // ...but clicking one is inert — no SelectOp reaches the store.
    fireEvent.click(item!);
    expect(ops).toEqual([]);
  });

  it("does not wire host callbacks into the target drop area (drops inert)", () => {
    const onInsert = vi.fn();
    const onMove = vi.fn();
    const onSelect = vi.fn();
    const { container } = renderOverlays(
      <Overlays
        targets={TARGETS}
        callbacks={{ onInsert, onMove, onSelect }}
        editable={false}
      />,
    );

    // Drop an insert payload on the target area; with callbacks stripped the
    // primitive's dispatch resolves to a no-op.
    const targetBox = container.querySelector<HTMLElement>(
      '[data-target-id="t1"]',
    );
    expect(targetBox).not.toBeNull();
    const dataTransfer = {
      getData: (key: string) =>
        key === DATA_TRANSFER_KEYS.type ? "text" : "",
    } as unknown as DataTransfer;
    fireEvent.drop(targetBox!, { dataTransfer });

    expect(onInsert).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    // Target hit-box select is inert too.
    fireEvent.click(targetBox!);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("Overlays selection", () => {
  it("dispatches a SelectOp when a content item is clicked", () => {
    const { ops, container } = renderOverlays(
      <Overlays targets={TARGETS} callbacks={NO_CALLBACKS} />,
    );
    // The selection box (`.ov-item`), not the target's inner drag hit-box
    // (`.ov-item-hit`) which the published TargetAreaOverlay renders wired to the
    // host callbacks rather than the store.
    const item = container.querySelector<HTMLElement>(
      '.ov-item[data-content-id="c1"]',
    );
    expect(item).not.toBeNull();
    fireEvent.click(item!);
    expect(ops).toEqual([
      { kind: "select", targetId: "t1", contentId: "c1" },
    ]);
  });
});
