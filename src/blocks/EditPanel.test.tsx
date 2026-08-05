/**
 * DASH-T-0032 — `<EditPanel>` tests.
 *
 * Exercises the session-scoped panel through the real editing provider while
 * injecting a fabricated snapshot for deterministic item resolution.
 */

import type { ChangeEvent, ReactNode } from "react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { EditingProvider, useEditingActions } from "../editing";
import type { EditingActions, EditingRef } from "../editing";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import type { BlockTypeRegistry } from "./BlockType.js";
import { EditPanel } from "./EditPanel.js";

afterEach(cleanup);

const content: CmsContent = { id: "c1", type: "text", value: "Hello" };
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

const registry: BlockTypeRegistry = [
  {
    type: "text",
    label: "Heading",
    renderField: (item, onEdit) => {
      const handleTitle = (e: ChangeEvent<HTMLInputElement>): void => {
        onEdit({ value: e.target.value });
      };
      const handleNotes = (e: ChangeEvent<HTMLTextAreaElement>): void => {
        onEdit({ value: e.target.value });
      };
      return (
        <div>
          <label>
            Title
            <input
              data-testid="title-field"
              value={item.value ?? ""}
              onChange={handleTitle}
            />
          </label>
          <label>
            Notes
            <textarea
              data-testid="notes-field"
              value={item.value ?? ""}
              onChange={handleNotes}
            />
          </label>
        </div>
      );
    },
  },
];

function queryRequired(container: ParentNode, selector: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(selector);
  if (el === null) {
    throw new Error(`Missing element: ${selector}`);
  }
  return el;
}

function renderPanel(): {
  actions: EditingActions;
  container: HTMLElement;
  rerenderPanel: () => void;
} {
  const captured: { current: EditingActions | null } = { current: null };
  const store = makeStore();
  function Probe(): ReactNode {
    captured.current = useEditingActions();
    return null;
  }
  function PanelTree(): ReactNode {
    return (
      <EditingProvider store={store}>
        <Probe />
        <EditPanel blockTypes={registry} snapshot={snapshot} />
      </EditingProvider>
    );
  }
  const { container, rerender } = render(<PanelTree />);
  const actions = captured.current;
  if (actions === null) {
    throw new Error("actions not captured");
  }
  const rerenderPanel = (): void => {
    rerender(<PanelTree />);
  };
  return { actions, container, rerenderPanel };
}

describe("DASH-T-0032 — EditPanel", () => {
  it("renders the hint, starts editing with focus, and stops editing (TC-001)", () => {
    const { actions, container, rerenderPanel } = renderPanel();
    expect(container.textContent).toContain("Click a block in the preview");
    expect(container.querySelector('[data-testid="title-field"]')).toBeNull();

    act(() => {
      actions.startEditing(ref);
    });

    const title = queryRequired(
      container,
      '[data-testid="title-field"]',
    );
    const notes = queryRequired(
      container,
      '[data-testid="notes-field"]',
    );
    expect(document.activeElement).toBe(title);

    notes.focus();
    fireEvent.change(notes, { target: { value: "Changed" } });
    rerenderPanel();
    expect(document.activeElement).toBe(notes);

    act(() => {
      actions.stopEditing();
    });

    expect(container.textContent).toContain("Click a block in the preview");
    expect(container.querySelector('[data-testid="title-field"]')).toBeNull();
  });

  it("reacts under providers without HostShell and has no axe violations (TC-002)", async () => {
    const { actions, container } = renderPanel();

    act(() => {
      actions.startEditing(ref);
    });

    expect(queryRequired(container, '[data-testid="title-field"]'))
      .toBeDefined();
    expect(await axe(container)).toHaveNoViolations();
  });
});
