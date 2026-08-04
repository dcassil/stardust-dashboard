/**
 * DASH-T-0030 — TC-001: the full composable-overlay surface resolves from the
 * package ROOT, additively (the existing `Overlays`/`DEFAULT_*` back-compat
 * exports still resolve), and the canonical Use-Case-1 composition type-checks
 * and runs when imported entirely from `@stardust-cms/dashboard`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { MappedTarget } from "@stardust-cms/iframe-adapter/host";
import {
  AdminProvider,
  ContentOverlay,
  ContentOverlayActions,
  EditButton,
  RemoveButton,
  MoveHandle,
  InsertZone,
  SelectionRing,
  useContentOverlayContext,
  Overlays,
  SD_CONTENT_OVERLAY,
  SD_ACTIONS,
  SD_EDIT_BUTTON,
  DEFAULT_DELETE_CLASS_NAME,
} from ".";
import type {
  ContentOverlayProps,
  ContentOverlayContextValue,
  EditButtonProps,
  InsertPayloadMapper,
  ContentStoreAdapter,
  ContentSnapshot,
} from ".";

afterEach(cleanup);

const target: MappedTarget = {
  targetId: "t1",
  isContainer: false,
  geometry: { top: 0, left: 0, width: 200, height: 200 },
  children: [
    {
      contentId: "c1",
      index: 0,
      isContainer: false,
      styleGroup: "text",
      geometry: { top: 10, left: 20, width: 100, height: 30 },
    },
  ],
};

function fakeStore(): ContentStoreAdapter {
  return { getSnapshot: (): ContentSnapshot => [], apply: (): ContentSnapshot => [] };
}

describe("DASH-T-0030 — composable overlay root surface (TC-001)", () => {
  it("resolves every new export from the package root (additive)", () => {
    for (const fn of [
      ContentOverlay,
      ContentOverlayActions,
      EditButton,
      RemoveButton,
      MoveHandle,
      InsertZone,
      SelectionRing,
      useContentOverlayContext,
    ]) {
      expect(typeof fn).toBe("function");
    }
    // Compound static parts are attached.
    expect(typeof ContentOverlay.SelectionRing).toBe("function");
    expect(typeof ContentOverlay.Actions).toBe("function");
    // sd-* hooks.
    expect([SD_CONTENT_OVERLAY, SD_ACTIONS, SD_EDIT_BUTTON]).toEqual([
      "sd-content-overlay",
      "sd-actions",
      "sd-edit-button",
    ]);
    // Back-compat surface still present.
    expect(typeof Overlays).toBe("function");
    expect(DEFAULT_DELETE_CLASS_NAME).toBe("ov-delete");
  });

  it("runs the canonical zero-fork composition imported from the root", () => {
    const openMyModal = vi.fn();
    // Types referenced so the public type surface is compile-checked too.
    const _props: ContentOverlayProps = { target };
    const _edit: EditButtonProps = { onClick: () => undefined };
    const _defaults: InsertPayloadMapper = (p) => p;
    const _ctx: ContentOverlayContextValue | null = null;
    void [_props, _edit, _defaults, _ctx];

    const { getByRole } = render(
      <AdminProvider store={fakeStore()}>
        <ContentOverlay target={target}>
          <ContentOverlay.SelectionRing />
          <ContentOverlay.Actions>
            <EditButton
              onClick={() => {
                openMyModal(target);
              }}
            />
            <RemoveButton />
          </ContentOverlay.Actions>
        </ContentOverlay>
      </AdminProvider>,
    );

    fireEvent.click(getByRole("button", { name: "Edit block" }));
    expect(openMyModal).toHaveBeenCalledWith(target);
  });
});
