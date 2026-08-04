/**
 * DASH-T-0019 — turnkey `AdminShell` integration test (TC-002).
 *
 * Renders the whole default admin over a fake adapter + a fabricated
 * `MappedTarget[]`, driving select / insert / delete / edit + open-modal +
 * sidebar-collapse, and asserts (a) the full frame works (every region landmark +
 * the auto-rendered `panels`/`tools`), (b) the single re-injection invariant
 * holds across the region composition, and (c) narrow per-region subscription
 * (NFR-006) — collapsing the sidebar does not re-render the modal subscriber.
 *
 * Driven through the REAL canvas engine (`CanvasProvider`) with `useStardustHost`
 * + `useSendElements` mocked, mirroring `MainContent.test`. jest-axe is not
 * installed (see DASH-T-0017) so a11y is asserted via landmark-role queries;
 * full axe coverage is the DASH-T-0022 hardening pass.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type {
  ConnectionState,
  UseStardustHostOptions,
  UseStardustHostResult,
  MappedTarget,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store";
import type { CanvasConfig } from "../shell";
import type { ModalState, SidebarState } from "../admin";
import type { EditingActions } from "../editing";

const hostState: {
  lastOptions: UseStardustHostOptions | null;
  connectionState: ConnectionState;
  targets: MappedTarget[];
} = { lastOptions: null, connectionState: "connected", targets: [] };

// Partial mock: keep the real host exports (Overlays → TargetAreaOverlay render
// the fabricated targets) and override ONLY the connection hook.
vi.mock("@stardust-cms/iframe-adapter/host", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@stardust-cms/iframe-adapter/host")
  >();
  return {
    ...actual,
    useStardustHost: (
      _ref: unknown,
      options: UseStardustHostOptions,
    ): UseStardustHostResult => {
      hostState.lastOptions = options;
      return {
        targets: hostState.targets,
        scale: 0.5,
        pointer: null,
        connectionState: hostState.connectionState,
        callbacks: {
          ...(options.onInsert ? { onInsert: options.onInsert } : {}),
          ...(options.onMove ? { onMove: options.onMove } : {}),
          ...(options.onSelect ? { onSelect: options.onSelect } : {}),
        },
      };
    },
  };
});

const sent: ContentPayload[] = [];
// A STABLE send (module-level identity) so `useInject`'s callback identity is
// stable and the connect effect does not re-fire on every render (mirrors
// MainContent.test) — otherwise a snapshot change would double-inject.
const stableSend = (payload: ContentPayload): Promise<void> => {
  sent.push(payload);
  return Promise.resolve();
};
vi.mock("../shell/useSendElements.js", () => ({ useSendElements: () => stableSend }));

const { CanvasProvider } = await import("../shell");
const {
  AdminProvider,
  useModalState,
  useSidebarState,
  useRegisterCommand,
  useRegisterExtension,
} = await import("../admin");
const { useEditingActions } = await import("../editing");
const { AdminShell } = await import("./AdminShell.js");

function payload(
  targetId: string,
  index: number,
  id: string,
  value: string,
): ContentPayload {
  return { targetId, contentId: id, index, content: { id, type: "text", value } };
}

/** A fake adapter that applies insert/edit/delete against an in-memory list. */
function createFakeAdapter(seed: ContentPayload[] = []): ContentStoreAdapter {
  let items: ContentPayload[] = [...seed];
  return {
    getSnapshot: (): ContentSnapshot => [...items],
    apply: (op: HostContentOp): ContentSnapshot => {
      if (op.kind === "insert") {
        items = [...items, payload(op.targetId, op.index, `new-${String(items.length)}`, "inserted")];
      } else if (op.kind === "delete") {
        items = items.filter((it) => it.contentId !== op.contentId);
      } else if (op.kind === "edit" && op.patch.value !== undefined) {
        const nextValue = op.patch.value;
        items = items.map((it) =>
          it.contentId === op.contentId
            ? { ...it, content: { ...it.content, value: nextValue } }
            : it,
        );
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

const target: MappedTarget = {
  targetId: "t1",
  isContainer: false,
  geometry: { top: 0, left: 0, width: 100, height: 40 },
  children: [],
};

/** Handles registered so the auto-render seams (panels/tools) have content. */
function RegisterHandles(): ReactNode {
  useRegisterExtension("panels", {
    id: "palette",
    render: () => <div data-testid="panel-palette">Palette</div>,
  });
  useRegisterExtension("tools", {
    id: "grid",
    render: () => <i data-testid="tool-grid" />,
  });
  useRegisterCommand({ id: "save", title: "Save", run: () => undefined });
  return null;
}

const handles: {
  modal: ModalState | null;
  sidebar: SidebarState | null;
  actions: EditingActions | null;
} = { modal: null, sidebar: null, actions: null };

function Capture(): ReactNode {
  const modal = useModalState();
  const sidebar = useSidebarState();
  const actions = useEditingActions();
  useEffect(() => {
    handles.modal = modal;
    handles.sidebar = sidebar;
    handles.actions = actions;
  });
  return null;
}

/** A modal-ONLY subscriber (NFR-006 render-count probe): it must not re-render
 * when unrelated slices — e.g. the sidebar — change. */
const modalRenders = { current: 0 };
function ModalProbe(): ReactNode {
  useModalState();
  useEffect(() => {
    modalRenders.current += 1;
  });
  return null;
}

function renderAdmin(store: ContentStoreAdapter): HTMLElement {
  const { container } = render(
    <AdminProvider store={store}>
      <CanvasProvider config={config}>
        <RegisterHandles />
        <Capture />
        <ModalProbe />
        <AdminShell />
      </CanvasProvider>
    </AdminProvider>,
  );
  return container;
}

beforeEach(() => {
  hostState.lastOptions = null;
  hostState.connectionState = "connected";
  hostState.targets = [target];
  sent.length = 0;
  handles.modal = null;
  handles.sidebar = null;
  handles.actions = null;
  modalRenders.current = 0;
});

afterEach(cleanup);

describe("DASH-T-0019 — turnkey AdminShell full frame (TC-002)", () => {
  it("assembles every region + auto-renders registered panels/tools", () => {
    const container = renderAdmin(createFakeAdapter());

    // The shell container + every region landmark/hook.
    expect(container.querySelector(".sd-shell-root")).not.toBeNull();
    expect(container.querySelector('.sd-topbar[role="banner"]')).not.toBeNull();
    expect(container.querySelector("aside.sd-sidebar")).not.toBeNull();
    expect(container.querySelector("main.sd-main-content")).not.toBeNull();
    expect(container.querySelector(".sd-iframe-area")).not.toBeNull();
    expect(container.querySelector(".sd-overlay-layer")).not.toBeNull();
    expect(container.querySelector("aside.sd-side-panel")).not.toBeNull();
    expect(container.querySelector(".sd-modal-host")).not.toBeNull();
    expect(container.querySelector('.sd-footer[role="contentinfo"]')).not.toBeNull();
    expect(container.querySelector(".sd-command-region")).not.toBeNull();

    // Auto-render seams: the registered panel (sidebar) + tool (command region).
    expect(container.querySelector('[data-testid="panel-palette"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tool-grid"]')).not.toBeNull();
    // Connection status chrome in the top bar.
    expect(
      container.querySelector(".sd-topbar__status")?.getAttribute("data-state"),
    ).toBe("connected");
  });

  it("drives select/insert/edit/delete with the single re-injection preserved", () => {
    const container = renderAdmin(createFakeAdapter([payload("t1", 0, "seed", "hi")]));

    // Nothing selected → the empty slot shows its default reason.
    expect(container.textContent).toContain("no-selection");

    // SELECT via the host onSelect callback → the empty slot yields.
    const onSelect = hostState.lastOptions?.onSelect;
    act(() => {
      onSelect?.("t1", "seed");
    });
    expect(container.textContent).not.toContain("no-selection");

    // INSERT via onInsert → exactly one injection of the inserted item (the
    // region composition did NOT open a second injection path).
    sent.length = 0;
    const onInsert = hostState.lastOptions?.onInsert;
    act(() => {
      onInsert?.("t1", 1, { type: "text" });
    });
    expect(sent.filter((p) => p.content.value === "inserted")).toHaveLength(1);

    // EDIT via the editing controller → snapshot updates, re-injected once.
    sent.length = 0;
    act(() => {
      handles.actions?.change({
        kind: "edit",
        targetId: "t1",
        contentId: "seed",
        patch: { value: "edited" },
      });
    });
    expect(sent.filter((p) => p.content.value === "edited")).toHaveLength(1);

    // DELETE via the editing controller → the re-injected snapshot no longer
    // contains the removed item.
    sent.length = 0;
    act(() => {
      handles.actions?.remove({ kind: "delete", targetId: "t1", contentId: "seed" });
    });
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.every((p) => p.contentId !== "seed")).toBe(true);
  });
});

describe("DASH-T-0019 — modal + collapse + narrow subscription (TC-002)", () => {
  it("opens a focus-trapped modal and collapses the sidebar to a rail", () => {
    const container = renderAdmin(createFakeAdapter());

    act(() => {
      handles.modal?.open("edit");
    });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");

    act(() => {
      handles.sidebar?.collapse(true);
    });
    expect(
      container.querySelector("aside.sd-sidebar")?.getAttribute("data-collapsed"),
    ).toBe("");
  });

  it("does not re-render the modal subscriber on a sidebar-only change (NFR-006)", () => {
    renderAdmin(createFakeAdapter());
    const before = modalRenders.current;
    act(() => {
      handles.sidebar?.collapse(true);
    });
    // The modal-state subscriber must not re-render for a sidebar change.
    expect(modalRenders.current).toBe(before);
  });
});
