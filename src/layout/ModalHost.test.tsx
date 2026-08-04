/**
 * DASH-T-0017 — `Shell.ModalHost` a11y tests.
 *
 * TC-001 (focus-trap + restore + Escape) and TC-002 (stack + role/aria + top-only
 * Escape), plus the NFR-006 narrow-subscription probe. `@testing-library/user-event`
 * is NOT installed, so keyboard is driven with `fireEvent.keyDown` and focus is
 * asserted via `document.activeElement`; the focus-trap handler itself reads
 * `document.activeElement`, so this exercises the real trap logic.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import {
  AdminProvider,
  useModalState,
  useOverlayState,
} from "../admin";
import type { ModalState, OverlayState } from "../admin";
import { ModalHost } from "./ModalHost.js";
import { SD_MODAL_HOST } from "./layoutTypes.js";
import type { ShellSlots } from "./layoutTypes.js";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

/** A modal-content override with two trap-cycle buttons + a close button. */
const bodySlots: Partial<ShellSlots> = {
  "modal-content": (c) => (
    <div>
      <button data-testid={`first-${c.id}`} type="button">
        first
      </button>
      <button data-testid={`last-${c.id}`} type="button">
        last
      </button>
    </div>
  ),
};

function renderHost(): {
  container: HTMLElement;
  modal: { current: ModalState | null };
  overlay: { current: OverlayState | null };
} {
  const modal: { current: ModalState | null } = { current: null };
  const overlay: { current: OverlayState | null } = { current: null };
  function Capture(): ReactNode {
    const modalValue = useModalState();
    const overlayValue = useOverlayState();
    useEffect(() => {
      modal.current = modalValue;
      overlay.current = overlayValue;
    });
    return null;
  }
  const { container } = render(
    <AdminProvider store={fakeStore}>
      <Capture />
      <button data-testid="trigger" type="button">
        open
      </button>
      <ModalHost slots={bodySlots} />
    </AdminProvider>,
  );
  return { container, modal, overlay };
}

describe("DASH-T-0017 — ModalHost focus-trap + restore + Escape (TC-001)", () => {
  it("moves focus in on open, traps Tab, and restores focus to the trigger on Escape", () => {
    const { container, modal } = renderHost();
    const trigger = container.querySelector<HTMLButtonElement>('[data-testid="trigger"]');
    trigger?.focus();
    expect(document.activeElement).toBe(trigger);

    act(() => {
      modal.current?.open("edit");
    });

    // Focus moved into the modal (first focusable).
    const first = container.querySelector<HTMLButtonElement>('[data-testid="first-edit"]');
    const last = container.querySelector<HTMLButtonElement>('[data-testid="last-edit"]');
    const dialog = container.querySelector<HTMLDivElement>('[data-modal-id="edit"]');
    expect(document.activeElement).toBe(first);

    // Tab at the last element wraps to the first (trap).
    last?.focus();
    act(() => {
      fireEventKeyDown(dialog, "Tab");
    });
    expect(document.activeElement).toBe(first);

    // Shift+Tab at the first wraps to the last.
    act(() => {
      fireEventKeyDown(dialog, "Tab", { shiftKey: true });
    });
    expect(document.activeElement).toBe(last);

    // Escape closes the modal and restores focus to the trigger.
    act(() => {
      fireEventKeyDown(dialog, "Escape");
    });
    expect(container.querySelector('[data-modal-id="edit"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("DASH-T-0017 — ModalHost stack + role/aria (TC-002)", () => {
  it("renders a dialog per stack entry with role/aria-modal; Escape closes only the top", () => {
    const { container, modal } = renderHost();
    expect(container.querySelector(`.${SD_MODAL_HOST}`)).not.toBeNull();

    act(() => {
      modal.current?.open("a");
    });
    act(() => {
      modal.current?.open("b");
    });

    const dialogs = container.querySelectorAll('[role="dialog"]');
    expect(dialogs).toHaveLength(2);
    dialogs.forEach((d) => {
      expect(d.getAttribute("aria-modal")).toBe("true");
    });

    // Escape on the top dialog (b, which holds focus) closes ONLY b.
    const top = container.querySelector<HTMLDivElement>('[data-modal-id="b"]');
    act(() => {
      fireEventKeyDown(top, "Escape");
    });
    expect(container.querySelector('[data-modal-id="b"]')).toBeNull();
    expect(container.querySelector('[data-modal-id="a"]')).not.toBeNull();
  });
});

describe("DASH-T-0017 — ModalHost narrow subscription (NFR-006)", () => {
  it("re-renders on modal changes but not on overlay changes", () => {
    const renders = { current: 0 };
    function ModalSubscriber(): ReactNode {
      useModalState();
      useEffect(() => {
        renders.current += 1;
      });
      return null;
    }
    const { modal, overlay } = renderHostWith(<ModalSubscriber />);

    const afterMount = renders.current;
    act(() => {
      modal.current?.open("x");
    });
    expect(renders.current).toBeGreaterThan(afterMount);
    const afterModal = renders.current;

    act(() => {
      overlay.current?.setMode("preview");
    });
    expect(renders.current).toBe(afterModal);
  });
});

/* helpers ------------------------------------------------------------------ */

function fireEventKeyDown(
  node: Element | null,
  key: string,
  init: { shiftKey?: boolean } = {},
): void {
  if (node === null) {
    throw new Error("keydown target missing");
  }
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  node.dispatchEvent(event);
}

function renderHostWith(extra: ReactNode): {
  modal: { current: ModalState | null };
  overlay: { current: OverlayState | null };
} {
  const modal: { current: ModalState | null } = { current: null };
  const overlay: { current: OverlayState | null } = { current: null };
  function Capture(): ReactNode {
    const modalValue = useModalState();
    const overlayValue = useOverlayState();
    useEffect(() => {
      modal.current = modalValue;
      overlay.current = overlayValue;
    });
    return null;
  }
  render(
    <AdminProvider store={fakeStore}>
      <Capture />
      {extra}
      <ModalHost />
    </AdminProvider>,
  );
  return { modal, overlay };
}
