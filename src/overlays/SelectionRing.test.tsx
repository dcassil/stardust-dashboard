/**
 * DASH-T-0024 — `<SelectionRing>` standalone primitive tests.
 *
 * Covers TC-001 (renders a keyboard-operable ring for the current content item),
 * selected-state styling/ARIA, exact mapped-geometry positioning, default
 * selection wiring, explicit `onClick` override, and the standalone explicit
 * `ref`/`geometry` fallback. The unit is mounted in the real `EditingProvider`
 * with a fake `ContentStoreAdapter`, matching the editing hook suites.
 */

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import type {
  MappedChild,
  MappedGeometry,
  MappedTarget,
} from "@stardust-cms/iframe-adapter/host";
import { EditingProvider, useEditingActions, useSelection } from "../editing";
import type { EditingActions, EditingRef } from "../editing";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { ContentOverlay } from "./ContentOverlay.js";
import { SelectionRing } from "./SelectionRing.js";

afterEach(cleanup);

const ref: EditingRef = { targetId: "t1", contentId: "c1" };
const geometry: MappedGeometry = { top: 10, left: 20, width: 100, height: 30 };
const child: MappedChild = {
  contentId: "c1",
  index: 0,
  isContainer: false,
  styleGroup: "text",
  geometry,
};
const target: MappedTarget = {
  targetId: "t1",
  isContainer: false,
  geometry: { top: 0, left: 0, width: 200, height: 200 },
  children: [child],
};

function makeStore(): ContentStoreAdapter {
  const snapshot: ContentSnapshot = [];
  return {
    getSnapshot: () => snapshot,
    apply: (): ContentSnapshot => snapshot,
  };
}

function SelectionProbe(): ReactNode {
  const selection = useSelection();
  return (
    <span
      data-testid="selection"
      data-target={selection.selectedTargetId ?? ""}
      data-content={selection.selectedContentId ?? ""}
    />
  );
}

function ActionsProbe({
  actionsRef,
}: {
  actionsRef: { current: EditingActions | null };
}): ReactNode {
  actionsRef.current = useEditingActions();
  return null;
}

function renderWithEditing(ui: ReactNode): ReturnType<typeof render> {
  return render(<EditingProvider store={makeStore()}>{ui}</EditingProvider>);
}

function renderCompound(
  ui: ReactNode,
  actionsRef?: { current: EditingActions | null },
): ReturnType<typeof render> {
  return renderWithEditing(
    <>
      {actionsRef ? <ActionsProbe actionsRef={actionsRef} /> : null}
      <SelectionProbe />
      <ContentOverlay target={target}>{ui}</ContentOverlay>
    </>,
  );
}

describe("DASH-T-0024 — SelectionRing", () => {
  it("renders the ring as a button from compound context (TC-001)", () => {
    const { getByLabelText } = renderCompound(<SelectionRing />);
    const button = getByLabelText("Select block");
    expect(button.tagName).toBe("BUTTON");
    expect(button.classList.contains("sd-selection-ring")).toBe(true);
    expect(button.classList.contains("ov-item")).toBe(true);
    expect(button.getAttribute("type")).toBe("button");
  });

  it("mirrors selected state through classes and aria-pressed", () => {
    const actionsRef: { current: EditingActions | null } = { current: null };
    const { getByLabelText } = renderCompound(<SelectionRing />, actionsRef);
    const button = getByLabelText("Select block");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      actionsRef.current?.select(ref);
    });

    expect(button.classList.contains("sd-selection-ring--selected")).toBe(true);
    expect(button.classList.contains("ov-item--selected")).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking the ring selects the resolved item", () => {
    const { getByLabelText, getByTestId } = renderCompound(<SelectionRing />);
    fireEvent.click(getByLabelText("Select block"));
    const selection = getByTestId("selection");
    expect(selection.getAttribute("data-target")).toBe("t1");
    expect(selection.getAttribute("data-content")).toBe("c1");
  });

  it("uses explicit onClick instead of the default select action", () => {
    const onClick = vi.fn();
    const { getByLabelText, getByTestId } = renderCompound(
      <SelectionRing onClick={onClick} />,
    );
    fireEvent.click(getByLabelText("Select block"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(getByTestId("selection").getAttribute("data-content")).toBe("");
  });

  it("fills the positioned item region in-context and merges className/style", () => {
    const { getByLabelText } = renderCompound(
      <SelectionRing className="mine" style={{ zIndex: 5 }} />,
    );
    const button = getByLabelText("Select block");
    // In-context the DASH-T-0023 item box carries the geometry, so the ring
    // fills it (no double-offset) rather than re-applying geometry.
    expect(button.style.position).toBe("absolute");
    expect(button.style.top).toBe("0px");
    expect(button.style.left).toBe("0px");
    expect(button.style.right).toBe("0px");
    expect(button.style.bottom).toBe("0px");
    expect(button.style.zIndex).toBe("5");
    expect(button.classList.contains("mine")).toBe(true);
  });

  it("positions from explicit geometry when standalone (no positioned parent)", () => {
    function Standalone(): ReactNode {
      return <SelectionRing itemRef={ref} geometry={geometry} />;
    }
    const { getByLabelText } = renderWithEditing(<Standalone />);
    const button = getByLabelText("Select block");
    expect(button.classList.contains("sd-selection-ring")).toBe(true);
    // Exactly the mapped values — no scale multiply (NFR-004).
    expect(button.style.position).toBe("absolute");
    expect(button.style.top).toBe("10px");
    expect(button.style.left).toBe("20px");
    expect(button.style.width).toBe("100px");
    expect(button.style.height).toBe("30px");
  });

  it("renders null without a resolvable item ref or compound context", () => {
    const { container } = renderWithEditing(<SelectionRing />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithEditing(
      <SelectionRing itemRef={ref} geometry={geometry} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
