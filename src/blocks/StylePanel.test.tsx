/**
 * DASH-T-0036 — `<StylePanel>` tests (TC-001).
 *
 * Covers schema rendering, controller edit routing, no-op blocks, bespoke
 * `renderStyle`, and an axe pass for labelled controls.
 */

import type { ReactNode } from "react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { EditingProvider, useEditingActions } from "../editing";
import type { EditingActions, EditingRef } from "../editing";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import type { BlockTypeRegistry } from "./BlockType.js";
import { StylePanel } from "./StylePanel.js";

afterEach(cleanup);

const content: CmsContent = { id: "c1", type: "text", value: "" };
const ref: EditingRef = { targetId: "t1", contentId: "c1" };
const snapshot: ContentSnapshot = [
  { targetId: "t1", contentId: "c1", index: 0, content },
];

function makeStore(): ContentStoreAdapter {
  return {
    getSnapshot: () => snapshot,
    apply: () => snapshot,
  };
}

function queryRequired(container: ParentNode, selector: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(selector);
  if (el === null) {
    throw new Error(`Missing element: ${selector}`);
  }
  return el;
}

function querySelect(container: ParentNode, selector: string): HTMLSelectElement {
  const el = queryRequired(container, selector);
  if (!(el instanceof HTMLSelectElement)) {
    throw new Error(`Expected select: ${selector}`);
  }
  return el;
}

function renderPanel(registry: BlockTypeRegistry): {
  actions: EditingActions;
  container: HTMLElement;
} {
  const captured: { current: EditingActions | null } = { current: null };
  function Probe(): ReactNode {
    captured.current = useEditingActions();
    return null;
  }
  const { container } = render(
    <EditingProvider store={makeStore()}>
      <Probe />
      <StylePanel blockTypes={registry} snapshot={snapshot} />
    </EditingProvider>,
  );
  const actions = captured.current;
  if (actions === null) {
    throw new Error("actions not captured");
  }
  return { actions, container };
}

describe("DASH-T-0036 — StylePanel", () => {
  it("renders styleSchema controls and routes edits through change", () => {
    const registry: BlockTypeRegistry = [
      {
        type: "text",
        label: "Text",
        styleSchema: [
          {
            key: "styleGroup",
            label: "Style",
            kind: "select",
            options: ["a", "b"],
          },
        ],
      },
    ];
    const { actions, container } = renderPanel(registry);
    const changeSpy = vi.spyOn(actions, "change");

    act(() => {
      actions.select(ref);
    });

    const field = querySelect(container, "select");
    fireEvent.change(field, { target: { value: "b" } });
    expect(changeSpy).toHaveBeenCalledWith({
      kind: "edit",
      targetId: "t1",
      contentId: "c1",
      patch: { styleGroup: "b" },
    });
  });

  it("renders no controls for a block with no style hook", () => {
    const { actions, container } = renderPanel([
      { type: "text", label: "Text" },
    ]);

    act(() => {
      actions.select(ref);
    });

    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector(".sd-style-panel")).not.toBeNull();
  });

  it("renders a bespoke renderStyle node", () => {
    const { actions, container } = renderPanel([
      {
        type: "text",
        label: "Text",
        renderStyle: (item) => (
          <div data-testid="custom-style">style:{item.id}</div>
        ),
      },
    ]);

    act(() => {
      actions.select(ref);
    });

    expect(queryRequired(container, '[data-testid="custom-style"]').textContent)
      .toBe("style:c1");
  });

  it("has no axe violations for rendered schema controls", async () => {
    const { actions, container } = renderPanel([
      {
        type: "text",
        label: "Text",
        styleSchema: [
          {
            key: "styleGroup",
            label: "Style",
            kind: "select",
            options: ["a", "b"],
          },
        ],
      },
    ]);

    act(() => {
      actions.select(ref);
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
