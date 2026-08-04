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

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import { ContentOverlay } from "./ContentOverlay.js";
import { useContentOverlayContext } from "./contentOverlayContext.js";
import type { ContentOverlayContextValue } from "./contentOverlayContext.js";
import { SD_CONTENT_OVERLAY, SD_CONTENT_OVERLAY_ITEM } from "./overlaysTypes.js";

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
});
