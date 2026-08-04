/**
 * DASH-T-0015 — `Shell.MainContent` (+ `IframeArea`/`OverlayLayer`) tests (TC-002).
 *
 * empty/loading slot gating + the single re-injection invariant, driven through
 * the REAL canvas engine (`CanvasProvider`) with `useStardustHost` mocked (so the
 * test controls connection state + fires the shell's op callbacks) and
 * `useSendElements` spied (so it counts injections). Mirrors the HostShell.test
 * mock strategy — the same engine now backs both paths, so one injector is shared.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import type {
  ConnectionState,
  HostPointer,
  UseStardustHostOptions,
  UseStardustHostResult,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store/adapter.js";
import type { CanvasConfig } from "../shell";

const hostState: {
  lastOptions: UseStardustHostOptions | null;
  connectionState: ConnectionState;
  scale: number;
  pointer: HostPointer;
} = { lastOptions: null, connectionState: "connected", scale: 0.5, pointer: null };

vi.mock("@stardust-cms/iframe-adapter/host", () => ({
  useStardustHost: (
    _ref: unknown,
    options: UseStardustHostOptions,
  ): UseStardustHostResult => {
    hostState.lastOptions = options;
    return {
      targets: [],
      scale: hostState.scale,
      pointer: hostState.pointer,
      connectionState: hostState.connectionState,
      callbacks: {
        ...(options.onInsert ? { onInsert: options.onInsert } : {}),
        ...(options.onMove ? { onMove: options.onMove } : {}),
        ...(options.onSelect ? { onSelect: options.onSelect } : {}),
      },
    };
  },
}));

const sent: ContentPayload[] = [];
const stableSend = (payload: ContentPayload): Promise<void> => {
  sent.push(payload);
  return Promise.resolve();
};
vi.mock("../shell/useSendElements.js", () => ({ useSendElements: () => stableSend }));

const { CanvasProvider } = await import("../shell");
const { AdminProvider } = await import("../admin");
const { MainContent } = await import("./MainContent.js");
const { IframeArea } = await import("./IframeArea.js");

function payload(
  targetId: string,
  index: number,
  id: string,
  value: string,
): ContentPayload {
  return { targetId, contentId: id, index, content: { id, type: "text", value } };
}

function createFakeAdapter(seed: ContentPayload[] = []): ContentStoreAdapter {
  let items: ContentPayload[] = [...seed];
  return {
    getSnapshot: (): ContentSnapshot => [...items],
    apply: (op: HostContentOp): ContentSnapshot => {
      if (op.kind === "insert") {
        items = [
          ...items,
          payload(op.targetId, op.index, `new-${String(items.length)}`, "inserted"),
        ];
      }
      return [...items];
    },
  };
}

const config: CanvasConfig = {
  iframeOrigin: "http://o.test:1",
  iframeSrc: "http://o.test:1/",
  designWidth: 640,
  designHeight: 480,
  headerOffset: 0,
  blockTypes: [{ type: "text", label: "Text", defaultValue: () => "New text" }],
  previewable: true,
};

function renderShell(store: ContentStoreAdapter): ReturnType<typeof render> {
  return render(
    <AdminProvider store={store}>
      <CanvasProvider config={config}>
        <MainContent>
          <div data-testid="overlay" />
        </MainContent>
      </CanvasProvider>
    </AdminProvider>,
  );
}

beforeEach(() => {
  hostState.lastOptions = null;
  hostState.connectionState = "connected";
  hostState.scale = 0.5;
  hostState.pointer = null;
  sent.length = 0;
});

afterEach(cleanup);

describe("DASH-T-0015 — MainContent structure + slot gating (TC-002)", () => {
  it("emits the main landmark + iframe/overlay regions, and the empty slot when nothing is selected", () => {
    const { container } = renderShell(createFakeAdapter());
    // main landmark + sd-* region hooks.
    expect(container.querySelector("main.sd-main-content")).not.toBeNull();
    expect(container.querySelector(".sd-iframe-area")).not.toBeNull();
    expect(container.querySelector("iframe.admin-canvas__iframe")).not.toBeNull();
    // Overlay layer + its children mounted inside the canvas box.
    expect(container.querySelector(".sd-overlay-layer")).not.toBeNull();
    expect(container.querySelector('[data-testid="overlay"]')).not.toBeNull();
    // No selection → the empty slot renders its default reason.
    expect(container.textContent).toContain("no-selection");
  });

  it("renders the loading slot while the connection is not ready", () => {
    hostState.connectionState = "connecting";
    const { container } = renderShell(createFakeAdapter());
    expect(container.textContent).toContain("Loading…");
  });

  it("applies consumer className/style on the main region", () => {
    const { container } = render(
      <AdminProvider store={createFakeAdapter()}>
        <CanvasProvider config={config}>
          <MainContent className="extra" style={{ minHeight: 300 }} />
        </CanvasProvider>
      </AdminProvider>,
    );

    const main = container.querySelector<HTMLElement>(".sd-main-content");
    expect(main).not.toBeNull();
    expect(main?.classList.contains("extra")).toBe(true);
    expect(main?.style.minHeight).toBe("300px");
  });

  it("applies consumer className/style on the iframe area", () => {
    const { container } = render(
      <AdminProvider store={createFakeAdapter()}>
        <CanvasProvider config={config}>
          <IframeArea className="extra" style={{ width: 320 }}>
            <div data-testid="iframe-child" />
          </IframeArea>
        </CanvasProvider>
      </AdminProvider>,
    );

    const iframeArea = container.querySelector<HTMLElement>(".sd-iframe-area");
    expect(iframeArea).not.toBeNull();
    expect(iframeArea?.classList.contains("extra")).toBe(true);
    expect(iframeArea?.style.width).toBe("320px");
    expect(container.querySelector('[data-testid="iframe-child"]')).not.toBeNull();
  });
});

describe("DASH-T-0015 — single re-injection preserved (TC-002)", () => {
  it("injects the inserted item exactly once (no double-injection via region wrapping)", () => {
    renderShell(createFakeAdapter([payload("t1", 0, "seed", "hi")]));

    // Baseline: the connect effect re-injected the seed once.
    expect(sent.length).toBeGreaterThanOrEqual(1);
    sent.length = 0;

    // Fire the shell's onInsert (the callback the mocked host received).
    const onInsert = hostState.lastOptions?.onInsert;
    expect(onInsert).toBeTypeOf("function");
    act(() => {
      onInsert?.("t1", 1, { type: "text" });
    });

    // Exactly one injection of the newly inserted item — the region wrapping did
    // NOT open a second injection path.
    expect(sent.filter((p) => p.content.value === "inserted")).toHaveLength(1);
  });
});
