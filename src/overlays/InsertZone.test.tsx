/**
 * DASH-T-0027 — `<InsertZone>` drop-target tests.
 *
 * TC-001 (palette drop → `add(insertOp)` with defaults applied) and the reorder
 * drop (`move(moveOp)`), plus read-only inertness and the `sd-insert-zone` hook.
 * The controller `add` applies immediately while `move` enqueues, so both are
 * asserted by spying on the shared `useEditingActions()` object the zone calls.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, createEvent, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import type { MappedTarget } from "@stardust-cms/iframe-adapter/host";
import { EditingProvider, useEditingActions } from "../editing";
import type { EditingActions } from "../editing";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { InsertZone } from "./InsertZone.js";
import { SD_INSERT_ZONE } from "./overlaysTypes.js";

afterEach(cleanup);

function makeStore(): ContentStoreAdapter {
  const snapshot: ContentSnapshot = [];
  return { getSnapshot: () => snapshot, apply: (): ContentSnapshot => snapshot };
}

const target: MappedTarget = {
  targetId: "t1",
  isContainer: false,
  geometry: { top: 0, left: 0, width: 200, height: 200 },
  children: [],
};

/** A `DataTransfer`-like whose `getData` returns the supplied map. */
function fakeTransfer(map: Record<string, string>): { getData: (k: string) => string } {
  return { getData: (k: string): string => map[k] ?? "" };
}

/** The rendered zone element (guarded so no null-assertion/cast is needed). */
function zoneOf(container: HTMLElement): Element {
  const zone = container.querySelector(`.${SD_INSERT_ZONE}`);
  if (zone === null) {
    throw new Error("insert zone not rendered");
  }
  return zone;
}

function renderZone(
  ui: ReactNode,
): { actions: EditingActions; container: HTMLElement } {
  const ref: { current: EditingActions | null } = { current: null };
  function Probe(): ReactNode {
    ref.current = useEditingActions();
    return null;
  }
  const { container } = render(
    <EditingProvider store={makeStore()}>
      <Probe />
      {ui}
    </EditingProvider>,
  );
  const actions = ref.current;
  if (actions === null) {
    throw new Error("actions not captured");
  }
  return { actions, container };
}

describe("DASH-T-0027 — InsertZone drop target", () => {
  it("resolves a palette drop to add(insertOp) with defaults applied (TC-001)", () => {
    const applyDefaults = vi.fn((payload: { type: string }) => ({
      ...payload,
      level: 1,
    }));
    const { actions, container } = renderZone(
      <InsertZone target={target} index={2} applyDefaults={applyDefaults} />,
    );
    const addSpy = vi.spyOn(actions, "add");
    fireEvent.drop(zoneOf(container), { dataTransfer: fakeTransfer({ type: "text" }) });

    expect(applyDefaults).toHaveBeenCalledWith({ type: "text" });
    expect(addSpy).toHaveBeenCalledWith({
      kind: "insert",
      targetId: "t1",
      index: 2,
      payload: { type: "text", level: 1 },
    });
  });

  it("resolves an existing-item drop to move(moveOp)", () => {
    const { actions, container } = renderZone(
      <InsertZone target={target} index={0} />,
    );
    const moveSpy = vi.spyOn(actions, "move");
    fireEvent.drop(zoneOf(container), {
      dataTransfer: fakeTransfer({
        isMove: "true",
        contentId: "c9",
        target: "t2",
        index: "3",
      }),
    });
    expect(moveSpy).toHaveBeenCalledWith({
      kind: "move",
      from: { targetId: "t2", index: 3, contentId: "c9" },
      to: { targetId: "t1", index: 0 },
    });
  });

  it("is inert in read-only mode (editable=false)", () => {
    const { actions, container } = renderZone(
      <InsertZone target={target} index={0} editable={false} />,
    );
    const addSpy = vi.spyOn(actions, "add");
    const moveSpy = vi.spyOn(actions, "move");
    fireEvent.drop(zoneOf(container), {
      dataTransfer: fakeTransfer({ type: "text" }),
    });
    expect(addSpy).not.toHaveBeenCalled();
    expect(moveSpy).not.toHaveBeenCalled();
  });

  it("permits drag-over drops when editable", () => {
    const { container } = renderZone(<InsertZone target={target} index={0} />);
    const event = createEvent.dragOver(zoneOf(container), { cancelable: true });
    fireEvent(zoneOf(container), event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves drag-over inert in read-only mode", () => {
    const { container } = renderZone(
      <InsertZone target={target} index={0} editable={false} />,
    );
    const event = createEvent.dragOver(zoneOf(container), { cancelable: true });
    fireEvent(zoneOf(container), event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores a malformed drop (no op) without throwing", () => {
    const { actions, container } = renderZone(
      <InsertZone target={target} index={0} />,
    );
    const addSpy = vi.spyOn(actions, "add");
    fireEvent.drop(zoneOf(container), {
      dataTransfer: fakeTransfer({}),
    });
    expect(addSpy).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = renderZone(<InsertZone target={target} index={0} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
