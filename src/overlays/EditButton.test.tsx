/**
 * DASH-T-0026 — `<EditButton>` action primitive tests.
 *
 * Covers the default controller route, the consumer override path, a11y naming,
 * and the stable disabled rendering required for non-editable states.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import type { EditingRef } from "../editing";
import { EditingProvider, useEditingActions, useEditingState } from "../editing";
import { ContentOverlay } from "./ContentOverlay.js";
import { EditButton } from "./EditButton.js";

afterEach(cleanup);

function makeStore(): ContentStoreAdapter {
  const snapshot: ContentSnapshot = [];
  return {
    getSnapshot: () => snapshot,
    apply: (): ContentSnapshot => snapshot,
  };
}

const child: MappedChild = {
  contentId: "c1",
  index: 0,
  isContainer: false,
  styleGroup: "text",
  geometry: { top: 10, left: 20, width: 100, height: 30 },
};
const target: MappedTarget = {
  targetId: "t1",
  isContainer: false,
  geometry: { top: 0, left: 0, width: 200, height: 200 },
  children: [child],
};

function ControllerProbe({
  onRead,
}: {
  onRead: (value: EditingRef | null, hasStartEditing: boolean) => void;
}): ReactNode {
  const editing = useEditingState();
  const actions = useEditingActions();
  onRead(editing.editingRef, typeof actions.startEditing === "function");
  return null;
}

describe("DASH-T-0026 — EditButton", () => {
  it("starts editing the overlay item by default (TC-001)", () => {
    let editingRef: EditingRef | null = null;
    let hasStartEditing = false;
    const { getByRole } = render(
      <EditingProvider store={makeStore()}>
        <ControllerProbe
          onRead={(value, hasAction) => {
            editingRef = value;
            hasStartEditing = hasAction;
          }}
        />
        <ContentOverlay target={target}>
          <EditButton />
        </ContentOverlay>
      </EditingProvider>,
    );

    fireEvent.click(getByRole("button", { name: "Edit block" }));
    expect(hasStartEditing).toBe(true);
    expect(editingRef).toEqual({ targetId: "t1", contentId: "c1" });
  });

  it("lets onClick replace the default action and stays accessible (TC-002)", async () => {
    let editingRef: EditingRef | null = null;
    const onClick = vi.fn();
    const { container, getByRole } = render(
      <EditingProvider store={makeStore()}>
        <ControllerProbe
          onRead={(value) => {
            editingRef = value;
          }}
        />
        <EditButton
          itemRef={{ targetId: "t1", contentId: "c1" }}
          onClick={onClick}
        />
      </EditingProvider>,
    );
    const button = getByRole("button", { name: "Edit block" });

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(editingRef).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders a disabled button when editable is false", () => {
    const { getByRole } = render(
      <EditingProvider store={makeStore()}>
        <EditButton
          itemRef={{ targetId: "t1", contentId: "c1" }}
          editable={false}
        />
      </EditingProvider>,
    );
    const button = getByRole("button", { name: "Edit block" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
