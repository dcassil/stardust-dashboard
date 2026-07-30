/**
 * Unit tests for the three assembled seams (SIFR-T-0036 AC):
 *
 *  1. **Store-adapter swap** — the same `HostShell` renders unchanged whether it
 *     is handed a hand-rolled fake `ContentStoreAdapter` or the real VCE adapter;
 *     an overlay op drives the injected snapshot through whichever store is
 *     plugged in (proves decoupling — the shell never names a store).
 *  2. **Block-type override** — the demo's `BLOCK_TYPES` registry drives the
 *     palette entries and the side-panel field editor; swapping the registry
 *     swaps what the palette renders and how a selected item edits.
 *  3. **Presentation-adapter (read-only) seam** — draft mode passes ops through;
 *     live/history mode swallows content ops but forwards selection.
 *
 * The seed helper is covered too (it publishes once so content opens live).
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "@stardust-cms/dashboard";

// Transport-only mock: passthrough provider + a capturing sender.
vi.mock("frame-link-react", () => ({
  FrameLinkProvider: ({ children }: { children: ReactNode }): ReactNode =>
    children,
  useSend:
    (_channel: string) =>
    (payload: ContentPayload): Promise<void> => {
      void payload;
      return Promise.resolve();
    },
}));

const { HostShell, Palette, SidePanel, StoreProvider } = await import(
  "@stardust-cms/dashboard"
);
const { createVersionedContentStoreAdapter } = await import(
  "../src/versionedContentStoreAdapter.js"
);
const { createSeededAdapter } = await import("./seed.js");
const { makePresentationAdapter } = await import("./presentationAdapter.js");
const { BLOCK_TYPES } = await import("./blockTypes.js");

afterEach(cleanup);

/* -------------------------------------------------------------------------- */
/* Seam 1: store-adapter swap                                                 */
/* -------------------------------------------------------------------------- */

describe("store-adapter swap seam", () => {
  /** A minimal in-memory fake adapter (no VCE) implementing the contract. */
  function createFakeAdapter(): ContentStoreAdapter {
    let snap: ContentPayload[] = [];
    return {
      getSnapshot: () => snap,
      apply: (op: HostContentOp): ContentSnapshot => {
        if (op.kind === "insert") {
          snap = [
            ...snap,
            {
              targetId: op.targetId,
              contentId: `fake-${snap.length}`,
              index: op.index,
              content: {
                id: `fake-${snap.length}`,
                type: "text",
                value: String(op.payload.value ?? ""),
              },
            },
          ];
        }
        return snap;
      },
    };
  }

  it("the SAME shell renders unchanged whether handed a fake adapter or the VCE adapter", () => {
    // The shell never names a store; both stores drop into the identical
    // `<HostShell store={...} />` composition and mount the same canvas + iframe.
    const fake = createFakeAdapter();
    const { container: c1, unmount } = render(
      <HostShell store={fake} blockTypes={BLOCK_TYPES} />,
    );
    expect(c1.querySelector("iframe")).not.toBeNull();
    unmount();

    const vce = createVersionedContentStoreAdapter();
    const { container: c2 } = render(
      <HostShell store={vce} blockTypes={BLOCK_TYPES} />,
    );
    expect(c2.querySelector("iframe")).not.toBeNull();
  });

  it("an op drives the snapshot the shell would inject through whichever store is plugged in", () => {
    // The shell injects the snapshot `store.apply(op)` returns; assert that
    // return for both stores (the injected payloads are store-produced).
    const fake = createFakeAdapter();
    const fakeSnap = fake.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "hi" },
    });
    expect(fakeSnap.find((p) => p.contentId === "fake-0")?.content.value).toBe(
      "hi",
    );

    const vce = createVersionedContentStoreAdapter();
    const vceSnap = vce.apply({
      kind: "insert",
      targetId: "hero",
      index: 0,
      payload: { type: "text", value: "hi" },
    });
    expect(vceSnap.find((p) => p.contentId === "col-0")?.content.value).toBe(
      "hi",
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Seam 2: block-type override                                                */
/* -------------------------------------------------------------------------- */

describe("block-type registry override seam", () => {
  it("Palette renders one draggable per registry entry", () => {
    render(<Palette blockTypes={BLOCK_TYPES} />);
    // getByTestId throws if absent, so presence is asserted by the call.
    expect(screen.getByTestId("palette-item-text")).toBeTruthy();
    expect(screen.getByTestId("palette-item-image")).toBeTruthy();
  });

  it("swapping the registry swaps the palette entries", () => {
    render(<Palette blockTypes={[{ type: "heading", label: "Heading" }]} />);
    expect(screen.getByTestId("palette-item-heading")).toBeTruthy();
    expect(screen.queryByTestId("palette-item-image")).toBeNull();
  });

  it("SidePanel renders the selected block's field editor from the registry", () => {
    const store = createVersionedContentStoreAdapter();
    store.apply({ kind: "insert", targetId: "hero", index: 0, payload: { type: "image", value: "a.png" } });
    render(
      <StoreProvider store={store}>
        <SidePanel
          blockTypes={BLOCK_TYPES}
          selectedTargetId="hero"
          selectedContentId="col-0"
        />
      </StoreProvider>,
    );
    // The `image` block's renderField renders the image input (not the text one).
    expect(screen.getByTestId("panel-image")).toBeTruthy();
    expect(screen.queryByTestId("panel-text")).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Seam 3: presentation adapter (read-only preview)                           */
/* -------------------------------------------------------------------------- */

describe("presentation adapter seam", () => {
  it("draft mode passes content ops through to the base adapter", () => {
    const base = createVersionedContentStoreAdapter();
    const pres = makePresentationAdapter(base, "draft", null, () => {});
    pres.apply({ kind: "insert", targetId: "hero", index: 0, payload: { type: "text", value: "X" } });
    expect(base.getDraft?.()).toHaveLength(1);
  });

  it("live/history mode swallows content ops (read-only) but forwards selection", () => {
    const base = createVersionedContentStoreAdapter();
    base.apply({ kind: "insert", targetId: "hero", index: 0, payload: { type: "text", value: "X" } });
    base.publish?.();

    const selected: string[] = [];
    const pres = makePresentationAdapter(base, "live", null, (s) =>
      selected.push(s.contentId ?? ""),
    );

    // A content op in live mode does NOT mutate the base.
    pres.apply({ kind: "delete", targetId: "hero", contentId: "col-0" });
    expect(base.getLive?.().find((p) => p.contentId === "col-0")).toBeDefined();

    // A select op is forwarded.
    pres.apply({ kind: "select", targetId: "hero", contentId: "col-0" });
    expect(selected).toContain("col-0");
  });

  it("history mode getSnapshot returns the materialized historical version", () => {
    const base = createVersionedContentStoreAdapter();
    base.apply({ kind: "insert", targetId: "hero", index: 0, payload: { type: "text", value: "keepsake" } });
    base.publish?.();
    const v = base.getLiveVersion();
    base.apply({ kind: "delete", targetId: "hero", contentId: "col-0" });
    base.publish?.();

    const pres = makePresentationAdapter(base, "history", v, () => {});
    expect(pres.getSnapshot().find((p) => p.contentId === "col-0")?.content.value).toBe(
      "keepsake",
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Seed helper                                                                */
/* -------------------------------------------------------------------------- */

describe("createSeededAdapter", () => {
  it("seeds the shared content tree and publishes it live", () => {
    const { adapter, seededVersion, liveSnapshot } = createSeededAdapter();
    // Live is non-empty right after seeding (seed publishes once).
    expect(liveSnapshot.length).toBeGreaterThan(0);
    expect(adapter.getLive?.().length).toBe(liveSnapshot.length);
    // The recorded version is inspectable and contains the hero title text.
    const historical = adapter.materializeVersion?.(seededVersion) ?? [];
    expect(
      historical.some((p) =>
        p.content.value?.includes("Edit any website, live"),
      ),
    ).toBe(true);
  });
});
