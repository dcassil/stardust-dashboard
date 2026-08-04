/**
 * DASH-T-0011 — event-timing under React 18 StrictMode.
 *
 * StrictMode double-invokes effects on mount; the drain-queue emitter must still
 * fire each action's events EXACTLY once (no double-fire). Complements the once-
 * per-action tests in eventEmitter.test.tsx by running under StrictMode.
 */

import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter, HostContentOp } from "../store";
import { EditingProvider } from "./EditingProvider.js";
import { useEditingActions } from "./hooks.js";
import type { EditingActions } from "./editingTypes.js";

afterEach(cleanup);

const store: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (op: HostContentOp): ContentSnapshot => (op.kind === "select" ? [] : []),
};

describe("DASH-T-0011 — StrictMode once-per-action emission", () => {
  it("fires onContentChange exactly once for a change under StrictMode", () => {
    const onContentChange = vi.fn();
    const ref: { current: EditingActions | null } = { current: null };
    function Probe(): ReactNode {
      ref.current = useEditingActions();
      return null;
    }
    render(
      <StrictMode>
        <EditingProvider store={store} onContentChange={onContentChange}>
          <Probe />
        </EditingProvider>
      </StrictMode>,
    );

    act(() => {
      ref.current?.change({
        kind: "edit", targetId: "t1", contentId: "c1", patch: { value: "x" },
      });
    });

    expect(onContentChange).toHaveBeenCalledTimes(1);
  });
});
