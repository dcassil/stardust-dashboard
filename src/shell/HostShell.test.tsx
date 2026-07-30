/**
 * Tests for `HostShell` (SIFR-T-0033).
 *
 * Strategy — keep it store-agnostic and transport-free:
 *  - a FAKE `ContentStoreAdapter` built in-test (no concrete store imported);
 *  - `useStardustHost` is mocked so the test can (a) read the config the shell
 *    passes it — proving props replace the demo's `config.ts` — and (b) invoke
 *    the shell's `onInsert` callback directly, driving an overlay op through the
 *    store without a real drag/drop or iframe;
 *  - `useSendElements` is mocked so the test can assert the store snapshot is
 *    injected via `cms/sendElements` after an op.
 *
 * TC-001 (props replace config.ts) and TC-002 (render slots override
 * layout/status) from the task map onto the suites below.
 */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type {
  ConnectionState,
  UseStardustHostOptions,
  UseStardustHostResult,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store/adapter.js";

/* -------------------------------------------------------------------------- */
/* Mocks                                                                      */
/* -------------------------------------------------------------------------- */

// Capture the options `HostShell` hands to `useStardustHost`, and expose a
// controllable connection state. The mock records the callbacks so a test can
// fire `onInsert` directly (no jsdom DataTransfer needed).
const hostState: {
  lastOptions: UseStardustHostOptions | null;
  connectionState: ConnectionState;
  scale: number;
} = { lastOptions: null, connectionState: "connected", scale: 0.5 };

vi.mock("@stardust-cms/iframe-adapter/host", () => ({
  useStardustHost: (
    _ref: unknown,
    options: UseStardustHostOptions,
  ): UseStardustHostResult => {
    hostState.lastOptions = options;
    return {
      targets: [],
      scale: hostState.scale,
      connectionState: hostState.connectionState,
      callbacks: {
        ...(options.onInsert ? { onInsert: options.onInsert } : {}),
        ...(options.onMove ? { onMove: options.onMove } : {}),
        ...(options.onSelect ? { onSelect: options.onSelect } : {}),
      },
    };
  },
}));

// Capture every payload pushed through `cms/sendElements`.
const sent: ContentPayload[] = [];
vi.mock("./useSendElements.js", () => ({
  useSendElements:
    () =>
    (payload: ContentPayload): Promise<void> => {
      sent.push(payload);
      return Promise.resolve();
    },
}));

// `FrameLinkProvider` is transport chrome irrelevant to this shell's logic;
// stub it to a passthrough so no real frame-link instance is created in jsdom.
vi.mock("frame-link-react", () => ({
  FrameLinkProvider: ({ children }: { children: ReactNode }): ReactNode =>
    children,
}));

// Import AFTER mocks are registered.
const { HostShell } = await import("./HostShell.js");
const { DEFAULT_DESIGN_WIDTH } = await import("./HostShell.js");

/* -------------------------------------------------------------------------- */
/* Fake ContentStoreAdapter                                                   */
/* -------------------------------------------------------------------------- */

function payload(
  targetId: string,
  index: number,
  id: string,
  value: string,
): ContentPayload {
  return { targetId, contentId: id, index, content: { id, type: "text", value } };
}

function createFakeAdapter(seed: ContentPayload[] = []): {
  adapter: ContentStoreAdapter;
  received: HostContentOp[];
} {
  let items: ContentPayload[] = [...seed];
  const received: HostContentOp[] = [];
  const adapter: ContentStoreAdapter = {
    getSnapshot: (): ContentSnapshot => [...items],
    apply: (op: HostContentOp): ContentSnapshot => {
      received.push(op);
      if (op.kind === "insert") {
        items = [
          ...items,
          payload(op.targetId, op.index, `new-${items.length}`, "inserted"),
        ];
      }
      // select/move/delete/edit: return a fresh snapshot (identity changes).
      return [...items];
    },
  };
  return { adapter, received };
}

/* -------------------------------------------------------------------------- */
/* Setup                                                                      */
/* -------------------------------------------------------------------------- */

beforeEach(() => {
  hostState.lastOptions = null;
  hostState.connectionState = "connected";
  hostState.scale = 0.5;
  sent.length = 0;
});

afterEach(() => {
  cleanup();
});

/* -------------------------------------------------------------------------- */
/* TC-001: props replace config.ts                                            */
/* -------------------------------------------------------------------------- */

describe("HostShell config props (TC-001)", () => {
  it("honors iframeSrc / design dims / origin instead of any hard-coded constant", () => {
    const { adapter } = createFakeAdapter();
    render(
      <HostShell
        store={adapter}
        iframeOrigin="http://example.test:9999"
        iframeSrc="http://example.test:9999/preview"
        designWidth={640}
        designHeight={480}
        headerOffset={17}
      />,
    );

    const iframe = document.querySelector("iframe.admin-canvas__iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe("http://example.test:9999/preview");
    // design width drives the unscaled iframe box, not a constant
    expect((iframe as HTMLIFrameElement).style.width).toBe("640px");
    expect((iframe as HTMLIFrameElement).style.height).toBe("480px");

    // origin + headerOffset are forwarded to the host hook
    expect(hostState.lastOptions?.origin).toBe("http://example.test:9999");
    expect(hostState.lastOptions?.headerOffset).toBe(17);
    // sanity: the value used differs from the built-in default
    expect(640).not.toBe(DEFAULT_DESIGN_WIDTH);
  });

  it("defaults iframeSrc to `${iframeOrigin}/` when omitted", () => {
    const { adapter } = createFakeAdapter();
    render(<HostShell store={adapter} iframeOrigin="http://host.test:5555" />);
    const iframe = document.querySelector("iframe.admin-canvas__iframe");
    expect(iframe?.getAttribute("src")).toBe("http://host.test:5555/");
  });
});

/* -------------------------------------------------------------------------- */
/* TC-002: render slots override layout/status                                */
/* -------------------------------------------------------------------------- */

describe("HostShell render slots (TC-002)", () => {
  it("renders the default ConnectionStatus strip when no renderStatus given", () => {
    const { adapter } = createFakeAdapter();
    render(<HostShell store={adapter} iframeOrigin="http://o.test:1" />);
    // default status strip carries the origin + scale
    expect(document.querySelector(".admin-status")).not.toBeNull();
    expect(screen.getByText(/origin http:\/\/o\.test:1/)).toBeTruthy();
  });

  it("uses a custom renderStatus and renderLayout when provided", () => {
    const { adapter } = createFakeAdapter();
    render(
      <HostShell
        store={adapter}
        iframeOrigin="http://o.test:1"
        renderStatus={(state, scale) => (
          <div data-testid="custom-status">
            {state}:{scale}
          </div>
        )}
        renderLayout={({ canvas, status }) => (
          <section data-testid="custom-layout">
            <div data-testid="layout-status-slot">{status}</div>
            <div data-testid="layout-canvas-slot">{canvas}</div>
          </section>
        )}
      >
        <div data-testid="overlay-children">overlays</div>
      </HostShell>,
    );

    // custom status sentinel replaces the default strip
    expect(screen.getByTestId("custom-status").textContent).toBe(
      "connected:0.5",
    );
    expect(document.querySelector(".admin-status")).toBeNull();

    // custom layout arranges the regions; canvas + overlay children present
    expect(screen.getByTestId("custom-layout")).toBeTruthy();
    expect(screen.getByTestId("layout-canvas-slot")).toBeTruthy();
    expect(screen.getByTestId("overlay-children")).toBeTruthy();
    // default admin-layout is NOT used
    expect(document.querySelector(".admin-layout")).toBeNull();
  });

  it("renders the default layout (admin-layout grid) when no renderLayout given", () => {
    const { adapter } = createFakeAdapter();
    render(<HostShell store={adapter} iframeOrigin="http://o.test:1" />);
    expect(document.querySelector(".admin-layout")).not.toBeNull();
    expect(document.querySelector(".admin-main")).not.toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Op → store → injection                                                     */
/* -------------------------------------------------------------------------- */

describe("HostShell op → store → cms/sendElements injection", () => {
  it("routes an overlay insert op through store.apply and injects the snapshot", () => {
    const { adapter, received } = createFakeAdapter([
      payload("t1", 0, "seed", "hello"),
    ]);
    render(
      <HostShell
        store={adapter}
        iframeOrigin="http://o.test:1"
        blockTypes={[
          { type: "text", label: "Text", defaultValue: () => "New text block" },
        ]}
      />,
    );

    // Baseline: the connect effect re-injects the seed snapshot once.
    const baselineSent = sent.length;
    expect(baselineSent).toBeGreaterThanOrEqual(1);

    // Fire the shell's onInsert (the callback the host hook received).
    const onInsert = hostState.lastOptions?.onInsert;
    expect(onInsert).toBeTypeOf("function");
    act(() => {
      onInsert?.("t1", 1, { type: "text" });
    });

    // The op reached the store as an insert (with the registry default value).
    const insertOp = received.find((op) => op.kind === "insert");
    expect(insertOp).toBeDefined();
    expect(insertOp).toMatchObject({
      kind: "insert",
      targetId: "t1",
      index: 1,
      payload: { type: "text", value: "New text block" },
    });

    // The resulting snapshot (seed + new item) was injected.
    expect(sent.length).toBeGreaterThan(baselineSent);
    const injectedNew = sent.find((p) => p.content.value === "inserted");
    expect(injectedNew).toBeDefined();
    expect(injectedNew?.targetId).toBe("t1");
  });

  it("seeds no insert default value when blockTypes is omitted (empty registry)", () => {
    const { adapter, received } = createFakeAdapter();
    render(<HostShell store={adapter} iframeOrigin="http://o.test:1" />);
    act(() => {
      hostState.lastOptions?.onInsert?.("t1", 0, { type: "text" });
    });
    const insertOp = received.find((op) => op.kind === "insert");
    expect(insertOp).toMatchObject({ kind: "insert", payload: { type: "text" } });
    // no `value` was seeded — the registry is empty
    expect(
      (insertOp as { payload: Record<string, unknown> }).payload.value,
    ).toBeUndefined();
  });

  it("spreads a partial-CmsContent defaultValue into the insert payload", () => {
    const { adapter, received } = createFakeAdapter();
    render(
      <HostShell
        store={adapter}
        iframeOrigin="http://o.test:1"
        blockTypes={[
          {
            type: "container",
            label: "Container",
            defaultValue: () => ({ column: true }),
          },
        ]}
      />,
    );
    act(() => {
      hostState.lastOptions?.onInsert?.("t1", 0, { type: "container" });
    });
    const insertOp = received.find((op) => op.kind === "insert");
    expect(insertOp).toMatchObject({
      kind: "insert",
      payload: { type: "container", column: true },
    });
  });

  it("routes a select op through the store without inserting content", () => {
    const { adapter, received } = createFakeAdapter();
    render(<HostShell store={adapter} iframeOrigin="http://o.test:1" />);

    const onSelect = hostState.lastOptions?.onSelect;
    act(() => {
      onSelect?.("t1", "c1");
    });

    expect(received.some((op) => op.kind === "select")).toBe(true);
    expect(received.some((op) => op.kind === "insert")).toBe(false);
  });
});
