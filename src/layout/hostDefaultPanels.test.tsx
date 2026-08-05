/**
 * DASH-T-0038 — the default `HostShell` sidebar composition (TC-001).
 *
 * `HostShell` registers a `panels` extension composing the DASH-I-0003 panels
 * (`<Palette>` + `<SidePanel.Content>`); the turnkey `AdminShell` sidebar
 * auto-renders it. This asserts a default `HostShell` (no `renderLayout`) with a
 * non-empty `blockTypes` shows the palette entries + the content panel. The host
 * adapter / send / frame-link are mocked exactly as in `HostShell.test.tsx`.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type {
  ConnectionState,
  HostPointer,
  UseStardustHostOptions,
  UseStardustHostResult,
} from "@stardust-cms/iframe-adapter/host";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store/adapter.js";
import type { BlockTypeRegistry } from "../blocks";

const hostState: {
  connectionState: ConnectionState;
  scale: number;
  pointer: HostPointer;
} = { connectionState: "connected", scale: 0.5, pointer: null };

vi.mock("@stardust-cms/iframe-adapter/host", () => ({
  useStardustHost: (
    _ref: unknown,
    options: UseStardustHostOptions,
  ): UseStardustHostResult => ({
    targets: [],
    scale: hostState.scale,
    pointer: hostState.pointer,
    connectionState: hostState.connectionState,
    callbacks: {
      ...(options.onInsert ? { onInsert: options.onInsert } : {}),
      ...(options.onMove ? { onMove: options.onMove } : {}),
      ...(options.onSelect ? { onSelect: options.onSelect } : {}),
    },
  }),
}));

const stableSend = (): Promise<void> => Promise.resolve();
vi.mock("../shell/useSendElements.js", () => ({
  useSendElements: () => stableSend,
}));

vi.mock("frame-link-react", () => ({
  FrameLinkProvider: ({ children }: { children: ReactNode }): ReactNode => children,
}));

const { HostShell } = await import("./HostShell.js");

function fakeAdapter(): ContentStoreAdapter {
  const received: HostContentOp[] = [];
  return {
    getSnapshot: (): ContentSnapshot => [],
    apply: (op: HostContentOp): ContentSnapshot => {
      received.push(op);
      return [];
    },
  };
}

const blockTypes: BlockTypeRegistry = [
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
];

afterEach(cleanup);

describe("DASH-T-0038 — default HostShell sidebar (TC-001)", () => {
  it("renders the bundled palette + content panel from the registered panels extension", () => {
    render(
      <HostShell
        store={fakeAdapter()}
        iframeOrigin="http://o.test:1"
        blockTypes={blockTypes}
      />,
    );

    // The block palette (one draggable source per registered block type).
    expect(screen.getByTestId("palette-item-text")).toBeTruthy();
    expect(screen.getByTestId("palette-item-image")).toBeTruthy();
    // The selection content panel, showing its empty hint (nothing selected).
    expect(
      screen.getByText("Click a block in the preview to edit it."),
    ).toBeTruthy();
  });
});
