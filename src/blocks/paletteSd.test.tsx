import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { BlockTypeRegistry } from "./BlockType.js";
import { SD_PALETTE } from "./panelTypes.js";
import { Palette } from "./Palette.js";

afterEach(cleanup);

const registry: BlockTypeRegistry = [{ type: "heading", label: "Heading" }];

describe("Palette sd-* hooks", () => {
  it("adds sd-palette to the legacy palette container", () => {
    render(<Palette blockTypes={registry} />);
    const item = screen.getByTestId("palette-item-heading");
    const palette = item.closest(".palette");

    if (palette === null) {
      throw new Error("Expected palette item to be inside the palette container.");
    }

    expect(palette.classList.contains(SD_PALETTE)).toBe(true);
  });
});
