/**
 * DASH-T-0027 — `<MoveHandle>` drag-source tests.
 *
 * TC-002 (drag start populates the host move keys so a later drop resolves to a
 * `MoveOp`), plus read-only disabling, the accessible name, and a jest-axe pass.
 * Resolves its item from the compound context or explicit props.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import type { EditingRef } from "../editing";
import { ContentOverlay } from "./ContentOverlay.js";
import { MoveHandle } from "./MoveHandle.js";
import { SD_MOVE_HANDLE } from "./overlaysTypes.js";

afterEach(cleanup);

const child: MappedChild = {
  contentId: "c1",
  index: 3,
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
const ref: EditingRef = { targetId: "t1", contentId: "c1" };

/** A `DataTransfer`-like capturing every `setData` call. */
function fakeTransfer(): { setData: ReturnType<typeof vi.fn> } {
  return { setData: vi.fn() };
}

/** The rendered handle element (guarded so no null-assertion/cast is needed). */
function handleOf(container: HTMLElement): Element {
  const handle = container.querySelector(`.${SD_MOVE_HANDLE}`);
  if (handle === null) {
    throw new Error("move handle not rendered");
  }
  return handle;
}

describe("DASH-T-0027 — MoveHandle drag source", () => {
  it("writes the host move keys on drag start from context (TC-002)", () => {
    const { container } = render(
      <ContentOverlay target={target}>
        <MoveHandle />
      </ContentOverlay>,
    );
    const dataTransfer = fakeTransfer();
    fireEvent.dragStart(handleOf(container), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("isMove", "true");
    expect(dataTransfer.setData).toHaveBeenCalledWith("target", "t1");
    expect(dataTransfer.setData).toHaveBeenCalledWith("contentId", "c1");
    expect(dataTransfer.setData).toHaveBeenCalledWith("index", "3");
  });

  it("works standalone from explicit itemRef/index", () => {
    const { container } = render(<MoveHandle itemRef={ref} index={5} />);
    const dataTransfer = fakeTransfer();
    fireEvent.dragStart(handleOf(container), {
      dataTransfer,
    });
    expect(dataTransfer.setData).toHaveBeenCalledWith("index", "5");
  });

  it("is a keyboard-operable button with an accessible name", () => {
    const { getByRole } = render(<MoveHandle itemRef={ref} index={0} />);
    const button = getByRole("button", { name: "Move block" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("draggable")).toBe("true");
  });

  it("is disabled and not draggable in read-only mode", () => {
    const { getByRole } = render(
      <MoveHandle itemRef={ref} index={0} editable={false} />,
    );
    const button = getByRole("button", { name: "Move block" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("draggable")).toBe("false");
  });

  it("has no axe violations", async () => {
    const { container } = render(<MoveHandle itemRef={ref} index={0} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
