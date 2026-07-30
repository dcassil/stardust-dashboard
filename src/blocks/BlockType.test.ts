/**
 * Tests for the `BlockType` registry helper (SIFR-T-0034, REQ-004).
 *
 * Covers `findBlockType`: hit, miss (graceful `undefined`, not a throw), and
 * first-match-wins ordering — the load-bearing lookup the SidePanel and shell
 * insert-defaults depend on.
 */

import { describe, expect, it } from "vitest";
import type { BlockTypeRegistry } from "./BlockType.js";
import { findBlockType } from "./BlockType.js";

const registry: BlockTypeRegistry = [
  { type: "heading", label: "Heading" },
  { type: "richText", label: "Rich text" },
  { type: "gallery", label: "Gallery" },
];

describe("findBlockType", () => {
  it("returns the matching block type", () => {
    expect(findBlockType(registry, "richText")).toEqual({
      type: "richText",
      label: "Rich text",
    });
  });

  it("returns undefined for an unknown type (no throw)", () => {
    expect(findBlockType(registry, "nope")).toBeUndefined();
  });

  it("returns undefined against an empty registry", () => {
    expect(findBlockType([], "heading")).toBeUndefined();
  });

  it("returns the first match when types repeat", () => {
    const dup: BlockTypeRegistry = [
      { type: "x", label: "first" },
      { type: "x", label: "second" },
    ];
    expect(findBlockType(dup, "x")?.label).toBe("first");
  });
});
