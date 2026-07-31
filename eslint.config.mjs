// @ts-check
/**
 * Strict guard-rails flat config for `@stardust-cms/dashboard` (the host
 * boilerplate). Enforces:
 *  - typescript-eslint strictTypeChecked + stylisticTypeChecked (type-aware),
 *  - size/complexity ceilings on non-test source,
 *  - a total ban on escape hatches (any / non-null / ts-comment / eslint-disable),
 *  - import hygiene (no cycles, no deep relative imports, no useless path segments),
 *  - MODULE BOUNDARIES via eslint-plugin-boundaries mirroring the depcruise
 *    NFR-001 invariant: internal layers import each other ONLY via public
 *    entries, and NOTHING may reach a concrete store / versioned-content-engine.
 *
 * The layer public entries are the `index.ts` barrels; cross-layer imports must
 * resolve to them (boundaries/entry-point). React repo → react-hooks rules on.
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    // Not linted: build output, deps, the example app (own toolchain), and
    // root config/script files (not part of the type-aware `src` program).
    ignores: [
      "dist/**",
      "node_modules/**",
      "example/**",
      "coverage/**",
      "*.config.*",
      "scripts/**",
    ],
  },

  js.configs.recommended,

  // Type-aware strict rules apply ONLY to the `src` program. Root config files
  // (eslint.config.mjs, .dependency-cruiser.cjs, vitest.config.ts) are outside
  // the type-checked program and keep just the base recommended set.
  ...tseslint.configs.strictTypeChecked.map((c) => ({
    ...c,
    files: ["src/**/*.{ts,tsx}"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((c) => ({
    ...c,
    files: ["src/**/*.{ts,tsx}"],
  })),

  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      boundaries,
      import: importPlugin,
      "@eslint-community/eslint-comments": eslintComments,
      "react-hooks": reactHooks,
    },
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
      },
      // Layer definitions. `mode: "full"` matches each file's full path; the
      // barrel `index.ts` of each layer is its public entry (see entry-point).
      "boundaries/elements": [
        { type: "index", partialMatch: false, pattern: "src/index.ts" },
        { type: "store", partialMatch: false, pattern: "src/store/**" },
        { type: "blocks", partialMatch: false, pattern: "src/blocks/**" },
        { type: "overlays", partialMatch: false, pattern: "src/overlays/**" },
        { type: "shell", partialMatch: false, pattern: "src/shell/**" },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      /* ---- SIZE / COMPLEXITY (non-test source) ---- */
      "max-lines": [
        "error",
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 12],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      "max-nested-callbacks": ["error", 3],

      /* ---- ESCAPE HATCHES BANNED ---- */
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],

      /* ---- IMPORTS / DEPTH ---- */
      "import/no-cycle": ["error", { maxDepth: Infinity }],
      "import/no-useless-path-segments": ["error", { noUselessIndex: true }],
      // `no-restricted-imports` (deep-relative + NFR-001 store ban) is set in the
      // dedicated `src/**` override below so both pattern groups live together.

      /* ---- MODULE BOUNDARIES ---- */
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/entry-point": [
        "error",
        {
          default: "disallow",
          message:
            "Boundary violation: layer '{{from}}' must import layer '{{to}}' through its public entry (index.ts), not file '{{file}}'.",
          rules: [
            // Within a layer, any sibling file may be imported directly.
            { target: "store", allow: "**" },
            { target: "blocks", allow: "**" },
            { target: "overlays", allow: "**" },
            { target: "shell", allow: "**" },
            { target: "index", allow: "**" },
            // Cross-layer, the only importable file is the layer barrel.
            { target: ["store", "blocks", "overlays", "shell"], allow: "index.ts" },
          ],
        },
      ],
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message:
            "Boundary violation: '{{from.type}}' may not import '{{to.type}}'. Allowed edges are declared in eslint.config.mjs.",
          rules: [
            // The package root barrel wires every layer together.
            { from: "index", allow: ["store", "blocks", "overlays", "shell"] },
            // The shell composes the store seam, blocks, and overlays.
            { from: "shell", allow: ["store", "blocks", "overlays"] },
            // Overlays + blocks consume only the store seam.
            { from: "overlays", allow: ["store"] },
            { from: "blocks", allow: ["store"] },
            // The store seam (NFR-001) imports no other internal layer.
            { from: "store", allow: [] },
          ],
        },
      ],
    },
  },

  // Per-layer entry-point override so a file may import its own siblings freely
  // (the cross-layer `index.ts`-only rule is enforced by `element-types` above).
  // NFR-001: forbid any import of a concrete store / VCE anywhere under src.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../**", "../../../**"],
              message:
                "Deep relative import banned: import from a module's public entry, not across 2+ parent dirs.",
            },
            {
              group: [
                "**/versioned-content-engine",
                "**/versioned-content-engine/**",
                "@demo/**",
                "**/content-store",
                "**/content-store/**",
                "@stardust-cms/*content-store",
              ],
              message:
                "NFR-001: the store-agnostic shell (src/**) must never import a concrete content store or versioned-content-engine. Inject a ContentStoreAdapter instead.",
            },
          ],
        },
      ],
    },
  },

  // TEST OVERRIDE — relax size/selection ergonomics for tests; they may reach
  // across layers (they render the internal components directly).
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "**/testing/**",
    ],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "max-nested-callbacks": "off",
      "boundaries/element-types": "off",
      "boundaries/entry-point": "off",
      // Test probes deliberately capture hook return values into module-scope
      // variables / refs and assert on them — patterns the react-hooks correctness
      // rules flag in production code but which are the standard way to test a
      // hook's output. Capturing a bound method (`.apply`) is likewise fine here.
      "react-hooks/globals": "off",
      "react-hooks/refs": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
);
