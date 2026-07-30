/**
 * Tests for the registry-driven `Palette` (SIFR-T-0034, TC-001).
 *
 * Asserts palette entries are 1:1 with the injected `blockTypes` (no hard-coded
 * `text`/`image`), and that drag start sets the published `DATA_TRANSFER_KEYS.type`
 * to the entry's block type — the drag payload the library's `opFromDataTransfer`
 * turns into an `InsertOp`.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DATA_TRANSFER_KEYS } from "@stardust-cms/iframe-adapter/host";
import type { BlockTypeRegistry } from "./BlockType.js";
import { Palette } from "./Palette.js";

afterEach(cleanup);

const registry: BlockTypeRegistry = [
  { type: "heading", label: "Heading" },
  { type: "richText", label: "Rich text" },
  { type: "gallery", label: "Gallery" },
];

describe("Palette", () => {
  it("renders exactly one entry per block type, with matching labels", () => {
    render(<Palette blockTypes={registry} />);
    const items = screen.getAllByTestId(/^palette-item-/);
    expect(items).toHaveLength(3);
    expect(items.map((el) => el.getAttribute("data-block-type"))).toEqual([
      "heading",
      "richText",
      "gallery",
    ]);
    expect(screen.getByText("Rich text")).toBeDefined();
  });

  it("renders no entries and does not crash for an empty registry", () => {
    render(<Palette blockTypes={[]} />);
    expect(screen.queryAllByTestId(/^palette-item-/)).toHaveLength(0);
  });

  it("sets DATA_TRANSFER_KEYS.type to the block type on drag start", () => {
    render(<Palette blockTypes={registry} />);
    const item = screen.getByTestId("palette-item-gallery");

    const setData = vi.fn();
    const dataTransfer = {
      setData,
      effectAllowed: "",
    } as unknown as DataTransfer;

    fireEvent.dragStart(item, { dataTransfer });

    expect(setData).toHaveBeenCalledWith(DATA_TRANSFER_KEYS.type, "gallery");
    expect(dataTransfer.effectAllowed).toBe("copy");
  });
});
