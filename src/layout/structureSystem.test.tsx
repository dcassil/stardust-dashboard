/**
 * DASH-T-0022 — structure-layer a11y + responsive hardening and the
 * integration/system + level-4 custom-layout suite (TC-001 + TC-002).
 *
 * The correctness + accessibility backstop for DASH-I-0005. It layers over the
 * DASH-T-0019 `AdminShell.test` (which already proves the assembled frame + the
 * single-injection invariant + narrow subscription) with the hardening the final
 * task owns:
 *  - jest-axe on the assembled `AdminShell` (WCAG 2 A/AA scope — the NFR-003 bar;
 *    best-practice heuristics like `region` are out of scope since the stub
 *    `CommandRegion` intentionally has no landmark yet), plus a per-region
 *    landmark/role assertion.
 *  - Modal a11y driven by `@testing-library/user-event`: focus-trap wrap at both
 *    boundaries, focus-restore-on-close, Escape-to-close (P0).
 *  - Responsive collapse across breakpoints (desktop/tablet always-present,
 *    mobile drawer) + `Shell.Root` breakpoint reflow — via injected contexts
 *    (`useLayoutState().breakpoint` has no public setter yet; DASH-T-0007).
 *  - The level-4 proof: a bespoke layout composed from the `Shell.*` primitives
 *    ONLY (sidebar-right, top bar omitted, custom footer) under one
 *    `AdminProvider`, exercising select/edit + modal + collapse + a11y + the
 *    NFR-006 narrow-subscription probe — composability without forking.
 *
 * Driven through the REAL canvas engine (`CanvasProvider`) with `useStardustHost`
 * + `useSendElements` mocked, mirroring `AdminShell.test`.
 */

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "jest-axe";
import { useEffect, useState } from "react";
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
import type {
  Breakpoint,
  LayoutState,
  ModalState,
  SidebarState,
} from "../admin";
import type { EditingActions } from "../editing";
import { LayoutContext, SidebarContext } from "../admin/adminContext.js";
import type { ShellSlots } from "./layoutTypes.js";

const hostState: {
  lastOptions: UseStardustHostOptions | null;
  connectionState: ConnectionState;
  targets: MappedTarget[];
} = { lastOptions: null, connectionState: "connected", targets: [] };

// Partial mock: keep the real host exports and override ONLY the connection hook
// (mirrors AdminShell.test) so the assembled shell drives real select/insert.
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
// A STABLE send so `useInject`'s callback identity is stable (mirrors
// AdminShell.test) — otherwise a snapshot change would double-inject.
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
const { Shell } = await import("./Shell.js");

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
    render: () => <span data-testid="tool-grid">grid</span>,
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

/** A modal-ONLY subscriber (NFR-006 render-count probe). */
const modalRenders = { current: 0 };
function ModalProbe(): ReactNode {
  useModalState();
  useEffect(() => {
    modalRenders.current += 1;
  });
  return null;
}

/** A `modal-content` slot with two focusable controls — the focus-trap fixture.
 * The last button closes the dialog (drives the "close" contract path too). */
const modalSlots: Partial<ShellSlots> = {
  "modal-content": (contract) => (
    <>
      <button type="button" data-testid="modal-first">
        First
      </button>
      <button type="button" data-testid="modal-last" onClick={contract.close}>
        Last
      </button>
    </>
  ),
};

function renderAdmin(
  store: ContentStoreAdapter,
  extra?: ReactNode,
): HTMLElement {
  const { container } = render(
    <AdminProvider store={store}>
      <CanvasProvider config={config}>
        <RegisterHandles />
        <Capture />
        <ModalProbe />
        {extra}
        <AdminShell slots={modalSlots} />
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

describe("DASH-T-0022 — assembled AdminShell a11y (TC-001)", () => {
  it("is axe-clean at WCAG 2 A/AA and emits every region landmark exactly once", async () => {
    const container = renderAdmin(createFakeAdapter());

    const results = await axe(container, {
      iframes: false,
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      // `color-contrast` needs real layout/paint (a canvas) — inert and noisy
      // under jsdom; the landmark/role/name rules the shell cares about run.
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();

    // Per-region landmark/role (NFR-003): one banner/main/contentinfo, two
    // complementary regions disambiguated by distinct accessible names.
    expect(container.querySelectorAll('[role="banner"]')).toHaveLength(1);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelectorAll('[role="contentinfo"]')).toHaveLength(1);
    const complementary = Array.from(container.querySelectorAll("aside")).map((el) =>
      el.getAttribute("aria-label"),
    );
    expect(complementary).toEqual(["Sidebar", "Side panel"]);
    // The embedded canvas iframe carries a title (frame-title, WCAG 4.1.2).
    expect(container.querySelector("iframe")?.getAttribute("title")).toBe(
      "Embedded site preview",
    );
  });
});

describe("DASH-T-0022 — modal focus management via user-event (P0, TC-001)", () => {
  it("moves focus in on open, restores it to the trigger on Escape-close", async () => {
    const user = userEvent.setup();
    const container = renderAdmin(
      createFakeAdapter(),
      <button type="button" data-testid="trigger">
        Open
      </button>,
    );
    const trigger = container.querySelector<HTMLElement>('[data-testid="trigger"]');
    await user.click(trigger!);
    expect(document.activeElement).toBe(trigger);

    // Open → focus moves to the first focusable inside the dialog.
    act(() => {
      handles.modal?.open("edit");
    });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(
      container.querySelector('[data-testid="modal-first"]'),
    );

    // Escape closes THAT dialog and restores focus to the original trigger.
    await user.keyboard("{Escape}");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("traps Tab / Shift+Tab within the dialog at both boundaries", async () => {
    const user = userEvent.setup();
    const container = renderAdmin(createFakeAdapter());
    act(() => {
      handles.modal?.open("edit");
    });
    const first = container.querySelector<HTMLElement>('[data-testid="modal-first"]');
    const last = container.querySelector<HTMLElement>('[data-testid="modal-last"]');

    // Forward Tab from the LAST focusable wraps to the first.
    last!.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);

    // Shift+Tab from the FIRST focusable wraps to the last.
    first!.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes via the modal-content close contract (last button)", async () => {
    const user = userEvent.setup();
    const container = renderAdmin(createFakeAdapter());
    act(() => {
      handles.modal?.open("edit");
    });
    await user.click(container.querySelector('[data-testid="modal-last"]')!);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});

/** A controllable admin harness exposing only the two slices `Shell.Sidebar` +
 * `Shell.Root` read, so breakpoint-driven behavior is drivable (no public
 * setter). `open` is internal state so the drawer trigger genuinely toggles. */
function ResponsiveHarness({
  breakpoint,
  collapsed = false,
}: {
  breakpoint: Breakpoint;
  collapsed?: boolean;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const sidebar: SidebarState = {
    open,
    collapsed,
    activeTab: "fields",
    setOpen: (v) => {
      setOpen(v);
    },
    toggle: () => {
      setOpen((o) => !o);
    },
    collapse: () => undefined,
    setActiveTab: () => undefined,
  };
  const layout: LayoutState = {
    visibleRegions: new Set<string>(),
    breakpoint,
    setRegionVisible: () => undefined,
  };
  return (
    <SidebarContext.Provider value={sidebar}>
      <LayoutContext.Provider value={layout}>
        <Shell.Root>
          <Shell.Sidebar />
        </Shell.Root>
      </LayoutContext.Provider>
    </SidebarContext.Provider>
  );
}

describe("DASH-T-0022 — responsive collapse across breakpoints (NFR-004, TC-001)", () => {
  it("keeps the panel present above the drawer breakpoint and reflows Shell.Root", () => {
    for (const breakpoint of ["desktop", "tablet"] as const) {
      const { container, unmount } = render(
        <ResponsiveHarness breakpoint={breakpoint} />,
      );
      expect(
        container.querySelector(".sd-shell-root")?.getAttribute("data-breakpoint"),
      ).toBe(breakpoint);
      // Above `mobile`: no drawer trigger, panel always present.
      expect(container.querySelector(".sd-sidebar__trigger")).toBeNull();
      expect(container.querySelector(".sd-sidebar__panel")).not.toBeNull();
      unmount();
    }
  });

  it("collapses to a toggleable drawer at the mobile breakpoint", () => {
    const { container } = render(<ResponsiveHarness breakpoint="mobile" />);
    const trigger = container.querySelector(".sd-sidebar__trigger");
    expect(trigger?.tagName).toBe("BUTTON");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    // Panel hidden until the drawer is opened.
    expect(container.querySelector(".sd-sidebar__panel")).toBeNull();
    act(() => {
      fireEvent.click(trigger!);
    });
    expect(container.querySelector(".sd-sidebar__trigger")?.getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(container.querySelector(".sd-sidebar__panel")).not.toBeNull();
  });

  it("reflects the collapsed rail state above the drawer breakpoint", () => {
    const { container } = render(
      <ResponsiveHarness breakpoint="desktop" collapsed />,
    );
    expect(
      container.querySelector("aside.sd-sidebar")?.getAttribute("data-collapsed"),
    ).toBe("");
    // Rail is still present (collapse ≠ drawer-hidden above mobile).
    expect(container.querySelector(".sd-sidebar__panel")).not.toBeNull();
  });
});

/** Level-4: a bespoke layout from the `Shell.*` primitives ONLY — no `AdminShell`.
 * Sidebar on the RIGHT (rendered after main), top bar omitted, a custom footer. */
function renderCustomLayout(store: ContentStoreAdapter): HTMLElement {
  const { container } = render(
    <AdminProvider store={store}>
      <CanvasProvider config={config}>
        <RegisterHandles />
        <Capture />
        <ModalProbe />
        <Shell.Root className="my-admin">
          <Shell.MainContent>
            <div data-testid="overlay-mount" />
          </Shell.MainContent>
          <Shell.Sidebar />
          <Shell.ModalHost slots={modalSlots} />
          <footer role="contentinfo" className="my-footer">
            Custom footer
          </footer>
        </Shell.Root>
      </CanvasProvider>
    </AdminProvider>,
  );
  return container;
}

describe("DASH-T-0022 — level-4 custom layout from primitives (TC-002)", () => {
  it("composes a bespoke shell with full behavior, a11y and collapse — no fork", async () => {
    const container = renderCustomLayout(
      createFakeAdapter([payload("t1", 0, "seed", "hi")]),
    );

    // The bespoke arrangement: main + a right complementary + custom footer, and
    // NO banner (the top bar was intentionally omitted).
    expect(container.querySelector("main.sd-main-content")).not.toBeNull();
    expect(container.querySelector('aside.sd-sidebar[aria-label="Sidebar"]')).not.toBeNull();
    expect(container.querySelector("footer.my-footer")).not.toBeNull();
    expect(container.querySelector('[role="banner"]')).toBeNull();

    // A11y still holds for the custom composition (WCAG 2 A/AA).
    const results = await axe(container, {
      iframes: false,
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      // `color-contrast` needs real layout/paint (a canvas) — inert and noisy
      // under jsdom; the landmark/role/name rules the shell cares about run.
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();

    // Behavior: selection flows through the region's own empty-slot logic.
    expect(container.textContent).toContain("no-selection");
    act(() => {
      hostState.lastOptions?.onSelect?.("t1", "seed");
    });
    expect(container.textContent).not.toContain("no-selection");

    // Behavior: an edit re-injects the updated snapshot exactly once — the
    // primitives kept the single-injection invariant outside AdminShell.
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

    // A11y: the ModalHost primitive still traps + labels the dialog.
    act(() => {
      handles.modal?.open("edit");
    });
    expect(
      container.querySelector('[role="dialog"]')?.getAttribute("aria-modal"),
    ).toBe("true");
    act(() => {
      handles.modal?.close("edit");
    });

    // Collapse: the sidebar primitive's rail state works in the custom layout.
    act(() => {
      handles.sidebar?.collapse(true);
    });
    expect(
      container.querySelector("aside.sd-sidebar")?.getAttribute("data-collapsed"),
    ).toBe("");
  });

  it("preserves narrow subscription in the custom layout (NFR-006)", () => {
    renderCustomLayout(createFakeAdapter());
    const before = modalRenders.current;
    act(() => {
      handles.sidebar?.collapse(true);
    });
    // A sidebar-only change must not re-render the modal subscriber.
    expect(modalRenders.current).toBe(before);
  });
});
