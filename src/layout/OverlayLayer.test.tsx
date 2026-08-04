/**
 * DASH-T-0015 — `Shell.OverlayLayer` tests (TC-001).
 *
 * Preview suppression via the shared `useOverlayState().mode`: chrome renders in
 * `edit`, is suppressed in `preview`. Driven through the real `AdminProvider`
 * with a fake store (no canvas engine needed — OverlayLayer reads only overlay
 * state). The mode setter is captured inside an effect (react-hooks/immutability).
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { AdminProvider, useOverlayState } from "../admin";
import type { OverlayState } from "../admin";
import { OverlayLayer } from "./OverlayLayer.js";
import { SD_OVERLAY_LAYER } from "./layoutTypes.js";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

describe("DASH-T-0015 — OverlayLayer suppresses chrome in preview (TC-001)", () => {
  it("renders chrome in edit mode and suppresses it in preview", () => {
    const overlay: { current: OverlayState | null } = { current: null };
    function CaptureOverlay(): ReactNode {
      const value = useOverlayState();
      useEffect(() => {
        overlay.current = value;
      });
      return null;
    }

    const { container } = render(
      <AdminProvider store={fakeStore}>
        <CaptureOverlay />
        <OverlayLayer>
          <div data-testid="chrome" />
        </OverlayLayer>
      </AdminProvider>,
    );

    // Default mode is "edit": the layer + its chrome render.
    expect(container.querySelector(`.${SD_OVERLAY_LAYER}`)).not.toBeNull();
    expect(container.querySelector(".admin-overlay-layer")).not.toBeNull();
    expect(container.querySelector('[data-testid="chrome"]')).not.toBeNull();

    act(() => {
      overlay.current?.setMode("preview");
    });

    // Preview: the whole editing layer is suppressed.
    expect(container.querySelector(`.${SD_OVERLAY_LAYER}`)).toBeNull();
    expect(container.querySelector('[data-testid="chrome"]')).toBeNull();

    act(() => {
      overlay.current?.setMode("edit");
    });

    // Back to edit: chrome restored.
    expect(container.querySelector('[data-testid="chrome"]')).not.toBeNull();
  });
});
