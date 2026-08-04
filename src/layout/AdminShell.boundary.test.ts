/**
 * DASH-T-0019 — the level-1 module-boundary proof (TC-001), source-scan half.
 *
 * Belt-and-suspenders alongside the `layout-public-entry-only` dependency-cruiser
 * rule: statically scan every non-test source file under `src/layout/` (the
 * turnkey `AdminShell` + all region primitives + helpers) and assert that every
 * cross-layer import (`../<something>`) resolves to that layer's PUBLIC barrel
 * (`../store`/`../editing`/`../admin`/`../blocks`/`../overlays`/`../shell`) —
 * never a package-private deep path (`../shell/canvasEngine.js`, etc.). This is
 * the load-bearing guarantee (REQ-007/NFR-001) that the default admin needs no
 * package internals to rebuild. Same-layer sibling imports (`./X.js`) are allowed.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LAYOUT_DIR = join(process.cwd(), "src", "layout");
/** A cross-layer specifier that is EXACTLY a public barrel (no deep path). */
const PUBLIC_BARREL = /^\.\.\/(store|editing|admin|blocks|overlays|shell)$/;
/** Any ES import/re-export specifier (static form). */
const IMPORT_RE = /(?:from|import)\s+["']([^"']+)["']/g;

function layoutSourceFiles(): readonly string[] {
  return readdirSync(LAYOUT_DIR).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\./.test(f),
  );
}

describe("DASH-T-0019 — level-1 module-boundary proof (source scan, TC-001)", () => {
  it("AdminShell + region primitives import cross-layer only through public barrels", () => {
    const violations: string[] = [];
    for (const file of layoutSourceFiles()) {
      const source = readFileSync(join(LAYOUT_DIR, file), "utf8");
      for (const match of source.matchAll(IMPORT_RE)) {
        const spec = match[1];
        if (spec === undefined) {
          continue;
        }
        // Only cross-layer (`../…`) specifiers are governed; siblings (`./…`)
        // and external packages (bare specifiers) are fine.
        if (spec.startsWith("../") && !PUBLIC_BARREL.test(spec)) {
          violations.push(`${file}: imports private path "${spec}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("actually scanned AdminShell + the region primitives (guards an empty glob)", () => {
    const files = layoutSourceFiles();
    expect(files).toContain("AdminShell.tsx");
    expect(files).toContain("MainContent.tsx");
    expect(files.length).toBeGreaterThanOrEqual(10);
  });
});
