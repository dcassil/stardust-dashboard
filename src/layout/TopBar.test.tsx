/**
 * DASH-T-0018 — `Shell.TopBar` tests.
 *
 * TC-001 (registry-read seams + stub content: connection status + account stub +
 * action-area built from a registered command/tool) and TC-002 (slot override
 * leaves the rest intact: whole-`topbar` override, plus a surgical `account`-only
 * override), plus the reserved-`navigation` no-throw probe.
 *
 * Driven through the REAL canvas engine (`CanvasProvider`) with `useStardustHost`
 * mocked so the test controls `connectionState`, mirroring `MainContent.test`.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type {
  ConnectionState,
  HostPointer,
  UseStardustHostResult,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import type { CanvasConfig } from "../shell";
import type { ShellSlots } from "./layoutTypes.js";

const hostState: {
  connectionState: ConnectionState;
  scale: number;
  pointer: HostPointer;
} = { connectionState: "connected", scale: 0.5, pointer: null };

vi.mock("@stardust-cms/iframe-adapter/host", () => ({
  useStardustHost: (): UseStardustHostResult => ({
    targets: [],
    scale: hostState.scale,
    pointer: hostState.pointer,
    connectionState: hostState.connectionState,
    callbacks: {},
  }),
}));

const stableSend = (): Promise<void> => Promise.resolve();
vi.mock("../shell/useSendElements.js", () => ({ useSendElements: () => stableSend }));

const { CanvasProvider } = await import("../shell");
const { AdminProvider, useRegisterCommand, useRegisterExtension } = await import(
  "../admin"
);
const { TopBar } = await import("./TopBar.js");

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

const config: CanvasConfig = {
  iframeOrigin: "http://o.test:1",
  iframeSrc: "http://o.test:1/",
  designWidth: 640,
  designHeight: 480,
  headerOffset: 0,
  blockTypes: [],
  previewable: true,
};

/** Registers a `Save` command + a `tools` handle so the action-area has content. */
function RegisterHandles(): ReactNode {
  useRegisterCommand({ id: "save", title: "Save", run: () => undefined });
  useRegisterExtension("tools", {
    id: "ruler",
    render: () => <i data-testid="tool-ruler" />,
  });
  return null;
}

function renderTopBar(slots?: Partial<ShellSlots>): HTMLElement {
  const { container } = render(
    <AdminProvider store={fakeStore}>
      <CanvasProvider config={config}>
        <RegisterHandles />
        {slots ? <TopBar slots={slots} /> : <TopBar />}
      </CanvasProvider>
    </AdminProvider>,
  );
  return container;
}

afterEach(cleanup);

describe("DASH-T-0018 — TopBar registry-read seams + stub content (TC-001)", () => {
  it("renders the banner, connection status, account stub, and action-area handles", () => {
    hostState.connectionState = "connected";
    const container = renderTopBar();

    const banner = container.querySelector<HTMLElement>('.sd-topbar[role="banner"]');
    expect(banner).not.toBeNull();

    const status = container.querySelector<HTMLElement>(".sd-topbar__status");
    expect(status?.getAttribute("data-state")).toBe("connected");

    // account stub (from the reserved currentUser seam) is present…
    expect(container.querySelector(".sd-account")).not.toBeNull();
    // …and the action-area toolbar carries the registered command + tool.
    const toolbar = container.querySelector<HTMLElement>('[role="toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.textContent).toContain("Save");
    expect(container.querySelector('[data-testid="tool-ruler"]')).not.toBeNull();
  });

  it("reflects a non-connected state without throwing", () => {
    hostState.connectionState = "connecting";
    const container = renderTopBar();
    expect(
      container.querySelector(".sd-topbar__status")?.getAttribute("data-state"),
    ).toBe("connecting");
  });
});

describe("DASH-T-0018 — TopBar reserved-navigation read is a no-op", () => {
  it("reads the reserved `navigation` kind without throwing and renders nothing for it", () => {
    // TopBar calls `useReservedExtensions("navigation")` on every render; a clean
    // mount proves the reserved read never throws (guard is on register, not read).
    expect(() => renderTopBar()).not.toThrow();
  });
});

describe("DASH-T-0018 — TopBar slot override leaves rest intact (TC-002)", () => {
  it("replaces the whole bar via the `topbar` slot but keeps the status chrome", () => {
    const container = renderTopBar({
      topbar: () => <div data-testid="custom-topbar">custom</div>,
    });
    expect(container.querySelector('[data-testid="custom-topbar"]')).not.toBeNull();
    // The default account/action-area are gone (whole-bar override)…
    expect(container.querySelector(".sd-account")).toBeNull();
    expect(container.querySelector('[role="toolbar"]')).toBeNull();
    // …but the region's own status chrome remains.
    expect(container.querySelector(".sd-topbar__status")).not.toBeNull();
  });

  it("overriding `account` alone leaves the action-area default intact", () => {
    const container = renderTopBar({
      account: () => <div data-testid="custom-account" />,
    });
    expect(container.querySelector('[data-testid="custom-account"]')).not.toBeNull();
    expect(container.querySelector(".sd-account")).toBeNull(); // default replaced
    expect(container.querySelector('[role="toolbar"]')).not.toBeNull(); // default kept
  });
});
