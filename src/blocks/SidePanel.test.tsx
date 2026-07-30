/**
 * Tests for the registry-driven `SidePanel` (SIFR-T-0034, TC-002).
 *
 * Strategy — store-agnostic: a FAKE `ContentStoreAdapter` (no concrete store),
 * wrapped in the real `StoreProvider`, records every `apply(op)`. Asserts:
 *  - a block's custom `renderField` is rendered for the selected item, and its
 *    edit routes to `store.apply({ kind: "edit", ..., patch })`;
 *  - a block with NO `renderField` falls back to the generic text field, which
 *    also dispatches an `edit` op;
 *  - an unknown type resolves the item and shows the generic field (graceful
 *    fallback, not a crash);
 *  - no selection shows the empty hint.
 */

import type { ChangeEvent } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store/adapter.js";
import { StoreProvider } from "../store/StoreProvider.js";
import type { BlockTypeRegistry } from "./BlockType.js";
import { SidePanel } from "./SidePanel.js";

afterEach(cleanup);

/* -------------------------------------------------------------------------- */
/* Fake store                                                                 */
/* -------------------------------------------------------------------------- */

function payload(
  targetId: string,
  contentId: string,
  type: string,
  value: string,
): ContentPayload {
  return {
    targetId,
    contentId,
    index: 0,
    content: { id: contentId, type: type as ContentPayload["content"]["type"], value },
  };
}

function makeStore(snapshot: ContentSnapshot): {
  store: ContentStoreAdapter;
  ops: HostContentOp[];
} {
  const ops: HostContentOp[] = [];
  const store: ContentStoreAdapter = {
    getSnapshot: () => snapshot,
    apply: (op) => {
      ops.push(op);
      return snapshot;
    },
  };
  return { store, ops };
}

/* -------------------------------------------------------------------------- */
/* A registry with a custom heading editor + a bare gallery (no renderField)  */
/* -------------------------------------------------------------------------- */

const registry: BlockTypeRegistry = [
  {
    type: "heading",
    label: "Heading",
    renderField: (content, onEdit) => {
      const handle = (e: ChangeEvent<HTMLInputElement>): void => {
        onEdit({ value: e.target.value });
      };
      return (
        <input
          data-testid="heading-editor"
          value={content.value ?? ""}
          onChange={handle}
        />
      );
    },
  },
  { type: "gallery", label: "Gallery" }, // no renderField -> default field
];

function renderPanel(
  snapshot: ContentSnapshot,
  selectedTargetId: string | null,
  selectedContentId: string | null,
  blockTypes: BlockTypeRegistry = registry,
): { ops: HostContentOp[] } {
  const { store, ops } = makeStore(snapshot);
  render(
    <StoreProvider store={store}>
      <SidePanel
        blockTypes={blockTypes}
        selectedTargetId={selectedTargetId}
        selectedContentId={selectedContentId}
      />
    </StoreProvider>,
  );
  return { ops };
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("SidePanel", () => {
  it("renders the block's custom renderField and routes edits to store.apply", () => {
    const snapshot = [payload("t1", "c1", "heading", "Hello")];
    const { ops } = renderPanel(snapshot, "t1", "c1");

    const input = screen.getByTestId("heading-editor") as HTMLInputElement;
    expect(input.value).toBe("Hello");

    fireEvent.change(input, { target: { value: "Hi there" } });

    expect(ops).toEqual([
      {
        kind: "edit",
        targetId: "t1",
        contentId: "c1",
        patch: { value: "Hi there" },
      },
    ]);
  });

  it("falls back to the generic field when the block has no renderField", () => {
    const snapshot = [payload("t1", "g1", "gallery", "seed")];
    const { ops } = renderPanel(snapshot, "t1", "g1");

    const field = screen.getByTestId("panel-default-field") as HTMLTextAreaElement;
    expect(field.value).toBe("seed");

    fireEvent.change(field, { target: { value: "new" } });
    expect(ops).toEqual([
      { kind: "edit", targetId: "t1", contentId: "g1", patch: { value: "new" } },
    ]);
  });

  it("renders the generic field for an unknown type (graceful fallback)", () => {
    const snapshot = [payload("t1", "u1", "text", "x")];
    renderPanel(snapshot, "t1", "u1"); // "text" not in registry
    expect(screen.getByTestId("panel-default-field")).toBeDefined();
  });

  it("shows the empty hint when nothing is selected", () => {
    const snapshot = [payload("t1", "c1", "heading", "Hello")];
    renderPanel(snapshot, null, null);
    expect(screen.getByText("Click a block in the preview to edit it.")).toBeDefined();
    expect(screen.queryByTestId("heading-editor")).toBeNull();
  });
});
