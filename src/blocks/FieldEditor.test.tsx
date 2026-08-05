/**
 * DASH-T-0031 — `<FieldEditor>` tests (TC-001).
 *
 * renderField vs generic-fallback rendering, and edit routing: the default path
 * forwards to the controller `change` action; an injected `onChange` supersedes
 * it. Mounted under the real `EditingProvider` (fake store) so the controller
 * path is exercised end-to-end.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { EditingProvider, useEditingActions } from "../editing";
import type { EditingActions } from "../editing";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { FieldEditor } from "./FieldEditor.js";
import type { BlockType } from "./BlockType.js";

afterEach(cleanup);

function makeStore(): ContentStoreAdapter {
  const snapshot: ContentSnapshot = [];
  return { getSnapshot: () => snapshot, apply: (): ContentSnapshot => snapshot };
}

const content: CmsContent = { id: "c1", type: "text", value: "hello" };

/** Render under a real EditingProvider, capturing the controller actions. */
function renderEditor(ui: ReactNode): { actions: EditingActions; container: HTMLElement } {
  const ref: { current: EditingActions | null } = { current: null };
  function Probe(): ReactNode {
    ref.current = useEditingActions();
    return null;
  }
  const { container } = render(
    <EditingProvider store={makeStore()}>
      <Probe />
      {ui}
    </EditingProvider>,
  );
  const actions = ref.current;
  if (actions === null) {
    throw new Error("actions not captured");
  }
  return { actions, container };
}

describe("DASH-T-0031 — FieldEditor", () => {
  it("renders the block's renderField when present", () => {
    const block: BlockType = {
      type: "text",
      label: "Text",
      renderField: (c) => <div data-testid="custom-field">custom:{c.value}</div>,
    };
    const { container } = renderEditor(
      <FieldEditor block={block} content={content} targetId="t1" />,
    );
    expect(container.querySelector('[data-testid="custom-field"]')?.textContent).toBe(
      "custom:hello",
    );
    // The generic fallback is not rendered.
    expect(container.querySelector('[data-testid="panel-default-field"]')).toBeNull();
  });

  it("renders the generic textarea when the block has no renderField", () => {
    const block: BlockType = { type: "text", label: "Text" };
    const { container } = renderEditor(
      <FieldEditor block={block} content={content} targetId="t1" />,
    );
    const field = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="panel-default-field"]',
    );
    expect(field).not.toBeNull();
    expect(field?.value).toBe("hello");
  });

  it("renders the generic textarea for an unknown/undefined block type", () => {
    const { container } = renderEditor(
      <FieldEditor content={content} targetId="t1" />,
    );
    expect(container.querySelector('[data-testid="panel-default-field"]')).not.toBeNull();
  });

  it("routes a default edit through the controller change action (TC-001)", () => {
    const { actions, container } = renderEditor(
      <FieldEditor content={content} targetId="t1" />,
    );
    const changeSpy = vi.spyOn(actions, "change");
    const field = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="panel-default-field"]',
    );
    if (field === null) {
      throw new Error("field not rendered");
    }
    fireEvent.change(field, { target: { value: "world" } });
    expect(changeSpy).toHaveBeenCalledWith({
      kind: "edit",
      targetId: "t1",
      contentId: "c1",
      patch: { value: "world" },
    });
  });

  it("uses the injected onChange instead of the controller when provided", () => {
    const onChange = vi.fn();
    const { actions, container } = renderEditor(
      <FieldEditor content={content} targetId="t1" onChange={onChange} />,
    );
    const changeSpy = vi.spyOn(actions, "change");
    const field = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="panel-default-field"]',
    );
    if (field === null) {
      throw new Error("field not rendered");
    }
    fireEvent.change(field, { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledWith({ value: "x" });
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it("emits sd-field-editor and merges className/style", () => {
    const { container } = renderEditor(
      <FieldEditor content={content} targetId="t1" className="mine" style={{ padding: 8 }} />,
    );
    const root = container.querySelector<HTMLElement>(".sd-field-editor");
    expect(root).not.toBeNull();
    expect(root?.classList.contains("mine")).toBe(true);
    expect(root?.style.padding).toBe("8px");
  });
});
