/**
 * DASH-T-0017 — `Shell.ModalHost`, the modal region with ENCAPSULATED a11y.
 *
 * Renders the `useModalState()` stack (narrow subscription, NFR-006); each entry
 * is a `role="dialog"` / `aria-modal="true"` dialog whose body is the
 * `modal-content` slot resolved with the `{ id, payload, close }` contract
 * (REQ-005/009). Each dialog encapsulates its own a11y (NFR-003):
 *  - on OPEN it captures the previously-focused element and moves focus inside;
 *  - on CLOSE (unmount) it RESTORES focus to that element — so a nested stack
 *    unwinds focus correctly (closing the top returns focus into the one below,
 *    closing the last returns focus to the original trigger);
 *  - it TRAPS Tab / Shift+Tab within itself (only the focused = top dialog's
 *    handler ever fires, since focus is trapped there);
 *  - Escape closes THAT dialog via `useModalState().close(id)` — a stacked modal
 *    closes only the top.
 *
 * A portal/`inert` variant is deferred (initiative Alternatives) — this round the
 * host renders within the shell tree.
 *
 * BOUNDARY: React + the `admin` public barrel + `./layout` siblings.
 */

import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useModalState } from "../admin";
import type { ModalEntry } from "../admin";
import { joinClasses } from "./classNames.js";
import { resolveSlot } from "./slots.js";
import { SD_MODAL_HOST } from "./layoutTypes.js";
import type { ModalContentContract, RegionProps, ShellSlots } from "./layoutTypes.js";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** The focusable descendants of a dialog, in DOM order. */
function focusable(node: HTMLElement): readonly HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/** Move focus to the first focusable descendant, else the dialog itself. */
function focusInto(node: HTMLElement): void {
  const first = focusable(node)[0];
  (first ?? node).focus();
}

/** Props for {@link ModalHost}: region props + the `modal-content` slot override. */
export interface ModalHostProps extends RegionProps {
  /** Consumer override for the `modal-content` slot (default = none this round). */
  readonly slots?: Partial<ShellSlots>;
}

export function ModalHost({ className, style, slots }: ModalHostProps): ReactNode {
  const modal = useModalState();
  const hostStyle: CSSProperties | undefined = style;
  return (
    <div
      className={joinClasses(SD_MODAL_HOST, className)}
      {...(hostStyle ? { style: hostStyle } : {})}
    >
      {modal.stack.map((entry) => (
        <ModalDialog
          key={entry.id}
          entry={entry}
          slots={slots}
          onClose={() => {
            modal.close(entry.id);
          }}
        />
      ))}
    </div>
  );
}

function ModalDialog({
  entry,
  slots,
  onClose,
}: {
  readonly entry: ModalEntry;
  readonly slots: Partial<ShellSlots> | undefined;
  readonly onClose: () => void;
}): ReactNode {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);

  // Capture + move focus on open; restore it on close (unmount). Mount/unmount
  // scoped so a nested stack unwinds focus in the right order.
  useEffect(() => {
    restoreRef.current = document.activeElement;
    const node = dialogRef.current;
    if (node) {
      focusInto(node);
    }
    return () => {
      const previous = restoreRef.current;
      if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const node = dialogRef.current;
    if (node === null) {
      return;
    }
    const items = focusable(node);
    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) {
      // No focusables — keep focus on the dialog itself.
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const contract: ModalContentContract = {
    id: entry.id,
    close: onClose,
    ...(entry.payload !== undefined ? { payload: entry.payload } : {}),
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="sd-modal-host__dialog"
      data-modal-id={entry.id}
      onKeyDown={onKeyDown}
    >
      {resolveSlot("modal-content", slots, contract)}
    </div>
  );
}
