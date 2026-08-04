/**
 * DASH-T-0026 — `<RemoveButton>` action primitive tests.
 *
 * Covers the controller delete route, the no-concrete-content guard, and stable
 * disabled rendering for non-editable states.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store";
import { EditingProvider } from "../editing";
import { ContentOverlay } from "./ContentOverlay.js";
import { RemoveButton } from "./RemoveButton.js";

afterEach(cleanup);

const snapshot: ContentSnapshot = [];

function makeStore(
  apply: (op: HostContentOp) => ContentSnapshot = () => snapshot,
): ContentStoreAdapter {
  return {
    getSnapshot: () => snapshot,
    apply,
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

function inProvider(node: ReactNode, store = makeStore()): ReactNode {
  return <EditingProvider store={store}>{node}</EditingProvider>;
}

function htmlButtonOf(element: HTMLElement): HTMLButtonElement {
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error("Expected an HTML button element");
  }
  return element;
}

describe("DASH-T-0026 — RemoveButton", () => {
  it("routes delete through the editing controller (TC-001)", () => {
    const apply = vi.fn((): ContentSnapshot => snapshot);
    const { getByRole } = render(
      inProvider(
        <ContentOverlay target={target}>
          <RemoveButton />
        </ContentOverlay>,
        makeStore(apply),
      ),
    );

    fireEvent.click(getByRole("button", { name: "Delete block" }));
    expect(apply).toHaveBeenCalledWith({
      kind: "delete",
      targetId: "t1",
      contentId: "c1",
    });
  });

  it("renders null when the ref has no concrete content id", () => {
    const { queryByRole } = render(
      inProvider(<RemoveButton itemRef={{ targetId: "t1", contentId: null }} />),
    );
    expect(queryByRole("button", { name: "Delete block" })).toBeNull();
  });

  it("renders null without a resolvable item ref or compound context", () => {
    const { container } = render(inProvider(<RemoveButton />));
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders a disabled button when editable is false", () => {
    const { getByRole } = render(
      inProvider(
        <RemoveButton
          itemRef={{ targetId: "t1", contentId: "c1" }}
          editable={false}
        />,
      ),
    );
    const button = getByRole("button", { name: "Delete block" });
    expect(htmlButtonOf(button).disabled).toBe(true);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      inProvider(<RemoveButton itemRef={{ targetId: "t1", contentId: "c1" }} />),
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
