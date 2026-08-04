/**
 * DASH-T-0028 — additive `sd-*` hooks on the bundled `Overlays`.
 *
 * The frozen `Overlays.test.tsx` proves the `ov-*` DOM + store-routed behavior is
 * unchanged (back-compat gate). THIS suite proves the DASH-T-0028 additive layer:
 * the bundled composition now ALSO emits the `sd-*` theme hooks alongside the
 * legacy `ov-*` classes, so DASH-I-0004 can theme the bundled default with the
 * same vocabulary as the standalone `<ContentOverlay>` — without any behavior or
 * public-API change (the bundled default stays store-routed by design; see the
 * `Overlays.tsx` header).
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import { StoreProvider } from "../store/StoreProvider.js";
import type { ContentSnapshot, ContentStoreAdapter } from "../store/adapter.js";
import { Overlays } from "./Overlays.js";
import {
  SD_CONTENT_OVERLAY,
  SD_CONTENT_OVERLAY_ITEM,
  SD_REMOVE_BUTTON,
} from "./overlaysTypes.js";

afterEach(cleanup);

function child(contentId: string, index: number): MappedChild {
  return {
    contentId,
    index,
    isContainer: false,
    styleGroup: "default",
    geometry: { top: 10 * index, left: 0, width: 100, height: 20 },
  };
}

const TARGETS: MappedTarget[] = [
  {
    targetId: "t1",
    isContainer: false,
    geometry: { top: 0, left: 0, width: 100, height: 100 },
    children: [child("c1", 0), child("c2", 1)],
  },
];

const CONTAINER_TARGETS: MappedTarget[] = [
  {
    targetId: "container1",
    isContainer: true,
    geometry: { top: 0, left: 0, width: 100, height: 100 },
    children: [child("c1", 0)],
  },
];

function fakeAdapter(): ContentStoreAdapter {
  return { getSnapshot: (): ContentSnapshot => [], apply: (): ContentSnapshot => [] };
}

function renderOverlays(ui: ReactNode): HTMLElement {
  const { container } = render(<StoreProvider store={fakeAdapter()}>{ui}</StoreProvider>);
  return container;
}

describe("DASH-T-0028 — Overlays additive sd-* hooks", () => {
  it("emits sd-content-overlay on each group alongside ov-group", () => {
    const container = renderOverlays(<Overlays targets={TARGETS} callbacks={{}} />);
    const group = container.querySelector(`.${SD_CONTENT_OVERLAY}`);
    expect(group).not.toBeNull();
    // Legacy hook still present on the same element (additive, not a replacement).
    expect(group?.classList.contains("ov-group")).toBe(true);
  });

  it("emits sd-content-overlay__item on each item wrapper", () => {
    const container = renderOverlays(<Overlays targets={TARGETS} callbacks={{}} />);
    expect(container.querySelectorAll(`.${SD_CONTENT_OVERLAY_ITEM}`)).toHaveLength(2);
  });

  it("emits sd-remove-button on the default delete affordance alongside ov-delete", () => {
    const container = renderOverlays(<Overlays targets={TARGETS} callbacks={{}} />);
    const removes = container.querySelectorAll(`.${SD_REMOVE_BUTTON}`);
    expect(removes).toHaveLength(2);
    expect(removes[0]?.classList.contains("ov-delete")).toBe(true);
  });

  it("keeps the sd-remove-button absent when showDeleteButton is false", () => {
    const container = renderOverlays(
      <Overlays targets={TARGETS} callbacks={{}} showDeleteButton={false} />,
    );
    expect(container.querySelectorAll(`.${SD_REMOVE_BUTTON}`)).toHaveLength(0);
  });

  it("marks container targets with the default container class", () => {
    const container = renderOverlays(
      <Overlays targets={CONTAINER_TARGETS} callbacks={{}} />,
    );
    expect(container.querySelector(".ov-target--container")).not.toBeNull();
  });
});
