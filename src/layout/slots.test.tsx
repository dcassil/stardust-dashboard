/**
 * DASH-T-0014 — `resolveSlot` + default slot renderer tests.
 *
 * TC-002 (override vs default resolution + typed-contract delivery) plus
 * per-branch checks of the default renderers (empty/loading/action-area) so the
 * coverage AC is met without a coverage tool. Pure render — no provider needed;
 * the renderers are functions of their contract.
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { resolveSlot } from "./slots.js";
import type { ModalContentContract } from "./layoutTypes.js";
import type { Command, ToolContribution } from "../admin";

afterEach(cleanup);

describe("DASH-T-0014 — resolveSlot override vs default + typed contract (TC-002)", () => {
  it("uses the default renderer when no override is present", () => {
    const { getByText } = render(
      <>{resolveSlot("empty", undefined, { reason: "no-selection" })}</>,
    );
    expect(getByText("no-selection")).not.toBeNull();
  });

  it("uses the override and passes it the documented typed contract", () => {
    const seen: { reason: string | null } = { reason: null };
    const node = resolveSlot(
      "empty",
      {
        empty: (contract) => {
          seen.reason = contract.reason;
          return <span>override:{contract.reason}</span>;
        },
      },
      { reason: "no-content" },
    );
    const { getByText } = render(<>{node}</>);
    expect(getByText("override:no-content")).not.toBeNull();
    // The override received the typed contract object, not DOM/props.
    expect(seen.reason).toBe("no-content");
  });

  it("delivers the modal-content contract (id + callable close) to an override", () => {
    const close = vi.fn();
    const contract: ModalContentContract = { id: "confirm", close };
    const captured: { id: string | null; close: (() => void) | null } = {
      id: null,
      close: null,
    };
    resolveSlot(
      "modal-content",
      {
        "modal-content": (c) => {
          captured.id = c.id;
          captured.close = c.close;
          return null;
        },
      },
      contract,
    );
    expect(captured.id).toBe("confirm");
    captured.close?.();
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("DASH-T-0014 — default renderer branches", () => {
  it("action-area renders command buttons that run on click + tool handles", () => {
    const run = vi.fn();
    const commands: readonly Command[] = [
      { id: "save", title: "Save", run },
    ];
    const tools: readonly ToolContribution[] = [
      { id: "ruler", render: (): ReactNode => <i data-testid="tool-ruler" /> },
    ];
    const { getByText, getByTestId } = render(
      <>{resolveSlot("action-area", undefined, { commands, tools })}</>,
    );
    expect(getByTestId("tool-ruler")).not.toBeNull();
    fireEvent.click(getByText("Save"));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("loading falls back to a default message when none is given", () => {
    const { getByText } = render(
      <>{resolveSlot("loading", undefined, {})}</>,
    );
    expect(getByText("Loading…")).not.toBeNull();
  });

  it("loading uses the provided message when present", () => {
    const { getByText } = render(
      <>{resolveSlot("loading", undefined, { message: "Connecting" })}</>,
    );
    expect(getByText("Connecting")).not.toBeNull();
  });
});
