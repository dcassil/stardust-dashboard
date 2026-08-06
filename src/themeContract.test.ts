/**
 * DASH-T-0046 — the load-bearing presentation-layer correctness gate.
 *
 * Enforces the theming CONTRACT for `@stardust-cms/dashboard/theme.css`:
 *  1. EMITTED ⇔ STYLED catalog — every exported `sd-*` name constant is styled
 *     in `theme.css`, and every `.sd-*` selector in `theme.css` is a real class
 *     emitted somewhere in the source (no orphaned hooks, no orphaned/typo'd
 *     selectors) — NFR-004 name stability.
 *  2. TOKEN-DRIVEN — `theme.css` carries zero hard-coded colors, so redefining a
 *     `--sd-*` token re-themes every rule (override path (a), REQ-005/REQ-003).
 *  3. DARK-THEME EXAMPLE — the documented dark recipe tokens all exist (Use Case 2).
 *  4. NO CSS-IN-JS — the package declares no runtime style-in-JS dependency
 *     (REQ-007 / NFR-001).
 *
 * The BEM sub-elements (`sd-*__x`), state modifiers (`sd-*--x`), and utility
 * hooks (`sd-account`, `sd-empty`, …) are emitted as inline literals rather than
 * exported constants, so the reverse "no orphan" direction is checked against
 * the full set of `sd-*` literals scanned from source — not against the named
 * constant catalog alone.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import * as overlayTypes from "./overlays/overlaysTypes.js";
import * as panelTypes from "./blocks/panelTypes.js";
import * as layoutTypes from "./layout/layoutTypes.js";

const root = process.cwd();
const themeCss = readFileSync(resolve(root, "src/tokens/theme.css"), "utf8");
const tokensCss = readFileSync(resolve(root, "src/tokens/tokens.css"), "utf8");

/** The stable NAMED catalog — every `sd-*` string exported by a *Types module. */
const catalog: ReadonlySet<string> = new Set(
  [overlayTypes, panelTypes, layoutTypes]
    .flatMap((mod) => Object.values(mod))
    .filter((v) => typeof v === "string" && v.startsWith("sd-")),
);

/** All `.sd-*` selector tokens present in theme.css (BEM/modifier tokens kept). */
const styledTokens: ReadonlySet<string> = new Set(
  (themeCss.match(/\.(sd-[a-zA-Z0-9_-]+)/g) ?? []).map((s) => s.slice(1)),
);

/** Every `sd-*` class literal emitted anywhere in the (non-test) source tree. */
function scanEmitted(): ReadonlySet<string> {
  const emitted = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || entry.name.includes(".test.")) {
        continue;
      }
      for (const m of readFileSync(full, "utf8").matchAll(/sd-[a-zA-Z0-9_-]+/g)) {
        emitted.add(m[0]);
      }
    }
  };
  walk(resolve(root, "src"));
  return emitted;
}
const emitted = scanEmitted();

describe("DASH-T-0046 — theme.css emitted ⇔ styled catalog (TC-001)", () => {
  it("styles every exported sd-* name constant (no unstyled hook)", () => {
    const unstyled = [...catalog].filter((name) => !styledTokens.has(name));
    expect(unstyled).toEqual([]);
  });

  it("has no orphaned selector — every .sd-* rule targets an emitted class", () => {
    const orphans = [...styledTokens].filter((token) => !emitted.has(token));
    expect(orphans).toEqual([]);
  });

  it("keeps the named catalog non-trivial (guards against an empty scan)", () => {
    expect(catalog.size).toBeGreaterThanOrEqual(20);
  });
});

describe("DASH-T-0046 — override paths (TC-002)", () => {
  it("(a) token redefinition: theme.css hard-codes no colors — all rules cascade from --sd-* tokens", () => {
    const colorLiterals = themeCss.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g) ?? [];
    expect(colorLiterals).toEqual([]);
  });

  it("(a) dark-theme example: every token in the documented dark recipe is defined in tokens.css", () => {
    const darkRecipe = ["--sd-bg", "--sd-panel-fg", "--sd-accent", "--sd-danger"];
    const missing = darkRecipe.filter((t) => !tokensCss.includes(`${t}:`));
    expect(missing).toEqual([]);
  });
});

describe("DASH-T-0046 — no runtime CSS-in-JS (REQ-007)", () => {
  it("declares no style-in-JS dependency", () => {
    const pkg: unknown = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8"),
    );
    const collect = (key: string): string[] => {
      if (typeof pkg !== "object" || pkg === null) {
        return [];
      }
      const group = (pkg as Record<string, unknown>)[key];
      return typeof group === "object" && group !== null ? Object.keys(group) : [];
    };
    const allDeps = new Set([
      ...collect("dependencies"),
      ...collect("devDependencies"),
      ...collect("peerDependencies"),
    ]);
    const cssInJs = [
      "styled-components",
      "@emotion/react",
      "@emotion/styled",
      "@emotion/css",
      "@stitches/react",
      "goober",
      "@vanilla-extract/css",
      "jss",
      "aphrodite",
      "styletron-react",
      "linaria",
      "@linaria/core",
    ];
    const found = cssInJs.filter((dep) => allDeps.has(dep));
    expect(found).toEqual([]);
  });
});
