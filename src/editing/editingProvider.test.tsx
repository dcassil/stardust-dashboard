/**
 * DASH-T-0005 — EditingProvider + focused-hook subscription tests.
 *
 * TC-001 (narrow subscription: a session-only consumer does NOT re-render on a
 * selection-only change — NFR-005) and TC-002 (hook-outside-provider guard).
 * TC-003 (useHostSelection back-compat) is deferred to DASH-T-0010/0011: to keep
 * `editing` free of any `shell` dependency, EditingProvider does NOT populate
 * `HostSelectionContext` — the shell derives it from `useSelection()` when it
 * mounts EditingProvider (option b in the task notes).
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { EditingProvider } from "./EditingProvider.js";
import { useEditingActions, useEditingState, useSelection } from "./hooks.js";
import type { EditingActions } from "./editingTypes.js";

afterEach(cleanup);

function makeStore(): ContentStoreAdapter {
  const snapshot: ContentSnapshot = [];
  return {
    getSnapshot: () => snapshot,
    apply: (): ContentSnapshot => snapshot,
  };
}

describe("DASH-T-0005 — narrow subscription (TC-001)", () => {
  it("a session-only consumer does not re-render on a selection-only change", () => {
    let selectionRenders = 0;
    let sessionRenders = 0;
    const actionsRef: { current: EditingActions | null } = { current: null };

    function SelectionProbe(): ReactNode {
      useSelection();
      selectionRenders += 1;
      return null;
    }
    function SessionProbe(): ReactNode {
      useEditingState();
      sessionRenders += 1;
      return null;
    }
    function ActionsProbe(): ReactNode {
      actionsRef.current = useEditingActions();
      return null;
    }

    render(
      <EditingProvider store={makeStore()}>
        <SelectionProbe />
        <SessionProbe />
        <ActionsProbe />
      </EditingProvider>,
    );

    const selectionBefore = selectionRenders;
    const sessionBefore = sessionRenders;

    act(() => {
      actionsRef.current?.select({ targetId: "t1", contentId: "c1" });
    });

    // Selection changed → selection consumer re-rendered; session slice is
    // untouched → its consumer did NOT re-render (separate context, NFR-005).
    expect(selectionRenders).toBeGreaterThan(selectionBefore);
    expect(sessionRenders).toBe(sessionBefore);
  });
});

describe("DASH-T-0005 — hook-outside-provider guard (TC-002)", () => {
  it("throws a clear error when a hook is used without EditingProvider", () => {
    function Orphan(): ReactNode {
      useEditingActions();
      return null;
    }
    // Silence the expected React error boundary console noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Orphan />)).toThrow(/EditingProvider/);
    spy.mockRestore();
  });
});
