/**
 * DASH-T-0023 — `<ContentOverlay>` compound root tests.
 *
 * TC-001 (renders the target drop area + provides a per-child context) and
 * TC-002 (positioning derives ONLY from the mapped geometry — no recompute),
 * plus the `sd-*`/className-merge hook, the standalone `null`-context fallback,
 * and the NFR-006 referential-stability probe. Pure render: `ContentOverlay`
 * calls no Stardust hooks, and `TargetAreaOverlay` is a context-free primitive,
 * so no provider is needed — the compound context is the unit under test.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import { AdminProvider } from "../admin";
import { useEditingState } from "../editing";
import type { EditingRef } from "../editing";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { ContentOverlay } from "./ContentOverlay.js";
import { EditButton } from "./EditButton.js";
import { MoveHandle } from "./MoveHandle.js";
import { RemoveButton } from "./RemoveButton.js";
import { useContentOverlayContext } from "./contentOverlayContext.js";
import type { ContentOverlayContextValue } from "./contentOverlayContext.js";
import {
  SD_ACTIONS,
  SD_CONTENT_OVERLAY,
  SD_CONTENT_OVERLAY_ITEM,
  SD_EDIT_BUTTON,
} from "./overlaysTypes.js";

afterEach(cleanup);

const child: MappedChild = {
  contentId: "c1",
  index: 0,
  isContainer: false,
  styleGroup: "text",
  geometry: { top: 10, left: 20, width: 100, height: 30 },
};

const target: MappedTarget = {
  targetId: "t1",
  isContainer: false,
  geometry: { top: 0, left: 0, width: 200, height: 200 },
  children: [child],
};

const containerTarget: MappedTarget = {
  targetId: "container1",
  isContainer: true,
  geometry: { top: 0, left: 0, width: 240, height: 240 },
  children: [child],
};

function makeStore(): ContentStoreAdapter {
  const snapshot: ContentSnapshot = [];
  return {
    getSnapshot: (): ContentSnapshot => snapshot,
    apply: (): ContentSnapshot => snapshot,
  };
}

function elementOf(container: HTMLElement, selector: string): HTMLElement {
  const element = container.querySelector(selector);
  if (element === null) {
    throw new Error(`Expected element for selector: ${selector}`);
  }
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected HTMLElement for selector: ${selector}`);
  }
  return element;
}

/** A probe that surfaces the compound context it reads. */
function Probe(): ReactNode {
  const ctx = useContentOverlayContext();
  return (
    <span
      data-testid="probe"
      data-target={ctx?.target.targetId ?? ""}
      data-content={ctx?.ref.contentId ?? ""}
      data-null={String(ctx === null)}
    />
  );
}

function EditingProbe({
  onRead,
}: {
  onRead: (value: EditingRef | null) => void;
}): ReactNode {
  const editing = useEditingState();
  onRead(editing.editingRef);
  return null;
}

describe("DASH-T-0023 — ContentOverlay compound root", () => {
  it("renders the target drop area and a per-child context (TC-001)", () => {
    const { container, getByTestId } = render(
      <ContentOverlay target={target}>
        <Probe />
      </ContentOverlay>,
    );
    // The wrapped TargetAreaOverlay renders the target box (stable data attr).
    expect(container.querySelector('[data-target-id="t1"]')).not.toBeNull();
    // The child gets a context carrying its target + normalized ref.
    const probe = getByTestId("probe");
    expect(probe.getAttribute("data-target")).toBe("t1");
    expect(probe.getAttribute("data-content")).toBe("c1");
    expect(probe.getAttribute("data-null")).toBe("false");
  });

  it("positions the child region straight from mapped geometry (TC-002)", () => {
    const { container } = render(<ContentOverlay target={target} />);
    const item = container.querySelector<HTMLElement>(`.${SD_CONTENT_OVERLAY_ITEM}`);
    expect(item).not.toBeNull();
    // Exactly the mapped values — no scale multiply, no offset drift.
    expect(item?.style.position).toBe("absolute");
    expect(item?.style.top).toBe("10px");
    expect(item?.style.left).toBe("20px");
    expect(item?.style.width).toBe("100px");
    expect(item?.style.height).toBe("30px");
  });

  it("emits sd-content-overlay and merges consumer className/style (REQ-010)", () => {
    const { container } = render(
      <ContentOverlay target={target} className="mine" style={{ zIndex: 5 }} />,
    );
    const root = container.querySelector<HTMLElement>(`.${SD_CONTENT_OVERLAY}`);
    expect(root).not.toBeNull();
    expect(root?.classList.contains("mine")).toBe(true);
    expect(root?.style.zIndex).toBe("5");
  });

  it("renders a mapped container target through the wrapped target area", () => {
    const { container } = render(
      <ContentOverlay
        target={containerTarget}
        targetClassName="container-hitbox"
      />,
    );
    expect(container.querySelector('[data-target-id="container1"]')).not.toBeNull();
    expect(container.querySelector(".container-hitbox")).not.toBeNull();
  });

  it("useContentOverlayContext is null outside a ContentOverlay (standalone fallback)", () => {
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("probe").getAttribute("data-null")).toBe("true");
  });

  it("keeps the context value referentially stable across re-render (NFR-006)", () => {
    const seen: ContentOverlayContextValue[] = [];
    function Capture(): ReactNode {
      const ctx = useContentOverlayContext();
      useEffect(() => {
        if (ctx) seen.push(ctx);
      });
      return null;
    }
    const { rerender } = render(
      <ContentOverlay target={target}>
        <Capture />
      </ContentOverlay>,
    );
    rerender(
      <ContentOverlay target={target}>
        <Capture />
      </ContentOverlay>,
    );
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(Object.is(seen[0], seen[seen.length - 1])).toBe(true);
  });

  it("supports zero-fork EditButton override inside the positioned Actions cluster (TC-002)", () => {
    let editingRef: EditingRef | null = null;
    const onClick = vi.fn();
    const { container } = render(
      <AdminProvider store={makeStore()}>
        <EditingProbe
          onRead={(value) => {
            editingRef = value;
          }}
        />
        <ContentOverlay target={target}>
          <ContentOverlay.Actions>
            <EditButton onClick={onClick} />
          </ContentOverlay.Actions>
        </ContentOverlay>
      </AdminProvider>,
    );
    const cluster = elementOf(container, `.${SD_ACTIONS}`);
    const button = elementOf(container, `.${SD_ACTIONS} .${SD_EDIT_BUTTON}`);

    expect(cluster.getAttribute("role")).toBe("toolbar");
    expect(cluster.style.position).toBe("absolute");
    expect(cluster.contains(button)).toBe(true);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(editingRef).toBeNull();
  });

  it("has no axe violations with the default action cluster", async () => {
    const { container } = render(
      <AdminProvider store={makeStore()}>
        <ContentOverlay target={target}>
          <ContentOverlay.SelectionRing />
          <ContentOverlay.Actions>
            <EditButton />
            <RemoveButton />
            <MoveHandle />
          </ContentOverlay.Actions>
        </ContentOverlay>
      </AdminProvider>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
