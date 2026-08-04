/**
 * DASH-T-0012 — the canonical "no bundled UI" usage example (Use Case 2),
 * compile-checked + executed so the README snippet cannot rot.
 *
 * An advanced consumer mounts `<EditingProvider>` with lifecycle callbacks and
 * drives editing from their OWN toolbar via `useEditingActions()` — no bundled
 * overlay or panel. Mirrors the README "Behavior layer" example verbatim.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  EditingProvider,
  useEditingActions,
  useEditingState,
  type ContentStoreAdapter,
  type ContentSnapshot,
  type HostContentOp,
} from "..";

afterEach(cleanup);

/** A trivial in-memory adapter (a real app injects its own store). */
function createMemoryStore(): ContentStoreAdapter {
  let snapshot: ContentSnapshot = [];
  return {
    getSnapshot: () => snapshot,
    apply: (op: HostContentOp): ContentSnapshot => {
      // A real store mutates per op; here we just return a fresh snapshot so
      // React consumers observe the change.
      snapshot = op.kind === "select" ? snapshot : [...snapshot];
      return snapshot;
    },
  };
}

/** A consumer's OWN toolbar — no bundled overlay/panel involved. */
function MyToolbar(): ReactNode {
  const actions = useEditingActions();
  const { isEditing } = useEditingState();
  return (
    <div>
      <button
        type="button"
        onClick={() => { actions.startEditing({ targetId: "hero", contentId: "title" }); }}
      >
        Edit title
      </button>
      <button
        type="button"
        onClick={() => {
          actions.change({
            kind: "edit", targetId: "hero", contentId: "title", patch: { value: "Hello" },
          });
          actions.stopEditing();
        }}
      >
        Save
      </button>
      <span>{isEditing ? "editing" : "idle"}</span>
    </div>
  );
}

describe("DASH-T-0012 — standalone Use Case 2 example", () => {
  it("drives editing programmatically with no bundled UI", () => {
    const openMyModal = vi.fn();
    const saveDraft = vi.fn();
    const store = createMemoryStore();

    let toolbar: HTMLElement;
    act(() => {
      const view = render(
        <EditingProvider
          store={store}
          onEditingStart={openMyModal}
          onContentChange={saveDraft}
        >
          <MyToolbar />
        </EditingProvider>,
      );
      toolbar = view.container;
    });

    const [editBtn, saveBtn] = Array.from(
      toolbar!.querySelectorAll("button"),
    );
    act(() => { editBtn?.click(); });
    expect(openMyModal).toHaveBeenCalledWith({ targetId: "hero", contentId: "title" });

    act(() => { saveBtn?.click(); });
    expect(saveDraft).toHaveBeenCalled();
    expect(toolbar!.querySelector("span")?.textContent).toBe("idle");
  });
});
