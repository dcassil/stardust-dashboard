/**
 * DASH-T-0025 — `ContentOverlay.Actions` named-slot tests.
 *
 * TC-001 (positioned cluster + typed contract delivered to a child) and TC-002
 * (the canonical custom-button composition), plus the `sd-actions`/className
 * hook and arbitrary-children rendering. `.Actions` is rendered inside a
 * `<ContentOverlay>` (which supplies the per-child `ref` via context) under an
 * `EditingProvider` (which supplies the action handles), proving a child reaches
 * exactly the capabilities the default buttons will.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { EditingProvider } from "../editing";
import { useEditingActions, useSelection } from "../editing";
import { ContentOverlay } from "./ContentOverlay.js";
import { ContentOverlayActions } from "./Actions.js";
import { useContentOverlayContext } from "./contentOverlayContext.js";
import { SD_ACTIONS } from "./overlaysTypes.js";

afterEach(cleanup);

function makeStore(): ContentStoreAdapter {
  const snapshot: ContentSnapshot = [];
  return {
    getSnapshot: () => snapshot,
    apply: (): ContentSnapshot => snapshot,
  };
}

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

function inOverlay(node: ReactNode): ReactNode {
  return (
    <EditingProvider store={makeStore()}>
      <ContentOverlay target={target}>{node}</ContentOverlay>
    </EditingProvider>
  );
}

describe("DASH-T-0025 — ContentOverlay.Actions named slot", () => {
  it("positions a toolbar cluster and emits sd-actions (+ className/style)", () => {
    const { container } = render(
      inOverlay(
        <ContentOverlayActions className="mine" style={{ zIndex: 9 }}>
          <button type="button">go</button>
        </ContentOverlayActions>,
      ),
    );
    const cluster = container.querySelector<HTMLElement>(`.${SD_ACTIONS}`);
    expect(cluster).not.toBeNull();
    expect(cluster?.getAttribute("role")).toBe("toolbar");
    expect(cluster?.classList.contains("mine")).toBe(true);
    expect(cluster?.style.position).toBe("absolute");
    expect(cluster?.style.top).toBe("4px");
    expect(cluster?.style.right).toBe("4px");
    expect(cluster?.style.zIndex).toBe("9");
  });

  it("delivers the item ref + action handles to a child via context (TC-001)", () => {
    const captured: {
      targetId: string | undefined;
      contentId: string | null | undefined;
      hasSelect: boolean;
    } = { targetId: undefined, contentId: undefined, hasSelect: false };
    function Probe(): ReactNode {
      const ctx = useContentOverlayContext();
      const actions = useEditingActions();
      captured.targetId = ctx?.ref.targetId;
      captured.contentId = ctx?.ref.contentId;
      captured.hasSelect = typeof actions.select === "function";
      return null;
    }
    render(inOverlay(<ContentOverlayActions><Probe /></ContentOverlayActions>));
    expect(captured.targetId).toBe("t1");
    expect(captured.contentId).toBe("c1");
    expect(captured.hasSelect).toBe(true);
  });

  it("makes a custom button reach the item ref with zero forking (TC-002)", () => {
    const onEdit = vi.fn();
    function CustomEdit(): ReactNode {
      const ctx = useContentOverlayContext();
      return (
        <button
          type="button"
          data-testid="custom"
          onClick={() => {
            onEdit(ctx?.ref);
          }}
        >
          Edit
        </button>
      );
    }
    const { getByTestId, container } = render(
      inOverlay(<ContentOverlayActions><CustomEdit /></ContentOverlayActions>),
    );
    // Positioned inside the cluster and clickable.
    expect(container.querySelector(`.${SD_ACTIONS} [data-testid="custom"]`)).not.toBeNull();
    fireEvent.click(getByTestId("custom"));
    expect(onEdit).toHaveBeenCalledWith({ targetId: "t1", contentId: "c1" });
  });

  it("renders arbitrary children in order", () => {
    const { getByText } = render(
      inOverlay(
        <ContentOverlayActions>
          <span>one</span>
          <span>two</span>
        </ContentOverlayActions>,
      ),
    );
    expect(getByText("one")).not.toBeNull();
    expect(getByText("two")).not.toBeNull();
  });

  it("selection hook remains readable alongside the slot (NFR-002 wiring)", () => {
    let seen: string | null | undefined;
    function ReadSel(): ReactNode {
      seen = useSelection().selectedContentId;
      return null;
    }
    render(inOverlay(<ContentOverlayActions><ReadSel /></ContentOverlayActions>));
    expect(seen).toBeNull();
  });
});
