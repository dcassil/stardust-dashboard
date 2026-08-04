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
 * resolve to them (enforced by the v7 `boundaries/dependencies` policies via the
 * `fileInternalPath: "index.ts"` target selector). React repo → react-hooks on.
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
        // Folder-based patterns (v7 classifies by folder). The layer folders are
        // listed FIRST so their files classify to them; `index` is a folder
        // pattern (`src/**`) placed LAST, so only the root `src/index.ts` barrel
        // (not under any layer folder) falls through to it. Same effective
        // classification as the old single-file pattern, without the v7
        // file-pattern advisory.
        { type: "store", partialMatch: false, pattern: "src/store/**" },
        { type: "editing", partialMatch: false, pattern: "src/editing/**" },
        { type: "admin", partialMatch: false, pattern: "src/admin/**" },
        { type: "layout", partialMatch: false, pattern: "src/layout/**" },
        { type: "blocks", partialMatch: false, pattern: "src/blocks/**" },
        { type: "overlays", partialMatch: false, pattern: "src/overlays/**" },
        { type: "shell", partialMatch: false, pattern: "src/shell/**" },
        { type: "index", partialMatch: false, pattern: "src/**" },
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
      // v7 `dependencies` replaces the deprecated `element-types` + `entry-point`
      // rules. Two enforcement concerns are folded into one policy list:
      //   (a) ALLOWED LAYER EDGES — which layer types may import which (was
      //       `element-types`). Cross-element imports are evaluated by default;
      //       same-element sibling imports are skipped automatically (no
      //       `checkInternals`), so a file may always import its own siblings.
      //   (b) PUBLIC-ENTRY DISCIPLINE — an allowed cross-layer import must
      //       resolve to that layer's `index.ts` barrel (was `entry-point`),
      //       expressed via the `fileInternalPath: "index.ts"` target selector.
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "Boundary violation: '{{from.type}}' may not import '{{to.type}}'. Allowed edges are declared in eslint.config.mjs.",
          policies: [
            // The package root barrel wires every layer together — through
            // each layer's public entry (index.ts).
            {
              from: { element: { type: "index" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        "store",
                        "editing",
                        "admin",
                        "blocks",
                        "overlays",
                        "shell",
                        // DASH-T-0020: the `HostShell` public cluster moved to the
                        // `layout` structure layer (thin wrapper over `AdminShell`);
                        // the root re-exports it from `layout/index.ts`. The root
                        // barrel wires every layer through its public entry — this
                        // is one more such edge, not a boundary relaxation.
                        "layout",
                      ],
                    },
                    fileInternalPath: "index.ts",
                  },
                },
              },
              message:
                "Boundary violation: the package root barrel '{{from.type}}' must import layer '{{to.type}}' through its public entry (index.ts), not file '{{to.internalPath}}'.",
            },
            // The editing behavior layer composes ONLY the store seam, via its
            // public entry (DASH-T-0001 boundary). Host op/ref types come from
            // the external `@stardust-cms/iframe-adapter` package (not governed).
            {
              from: { element: { type: "editing" } },
              allow: {
                to: { element: { type: "store", fileInternalPath: "index.ts" } },
              },
              message:
                "Boundary violation: '{{from.type}}' may import only the store seam, and only through its public entry (index.ts), not file '{{to.internalPath}}'.",
            },
            // The admin behavior layer composes the store seam and the editing
            // layer, each via its public entry (DASH-T-0001 boundary).
            {
              from: { element: { type: "admin" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["store", "editing"] },
                    fileInternalPath: "index.ts",
                  },
                },
              },
              message:
                "Boundary violation: '{{from.type}}' may import only store/editing, and only through their public entry (index.ts), not file '{{to.internalPath}}'.",
            },
            // The shell composes the store seam, blocks, overlays, and — since
            // the DASH-T-0010 refactor — the editing + admin behavior layers,
            // each via its public entry. (HostShell mounts AdminProvider and the
            // canvas reads useSelection/useOverlayState + useEditingActions.)
            {
              from: { element: { type: "shell" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["store", "blocks", "overlays", "editing", "admin"],
                    },
                    fileInternalPath: "index.ts",
                  },
                },
              },
              message:
                "Boundary violation: '{{from.type}}' may import only store/blocks/overlays/editing/admin, and only through their public entry (index.ts), not file '{{to.internalPath}}'.",
            },
            // The layout (structure) layer composes the behavior barrels
            // (admin/editing) + content barrels (blocks/overlays) + the store
            // seam, each via its public entry (DASH-T-0013 boundary). It never
            // imports a concrete store or geometry internals.
            {
              from: { element: { type: "layout" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["store", "editing", "admin", "blocks", "overlays", "shell"],
                    },
                    fileInternalPath: "index.ts",
                  },
                },
              },
              message:
                "Boundary violation: '{{from.type}}' may import only store/editing/admin/blocks/overlays/shell, and only through their public entry (index.ts), not file '{{to.internalPath}}'.",
            },
            // Overlays consume only the store seam, via its public entry.
            {
              from: { element: { type: "overlays" } },
              allow: {
                to: { element: { type: "store", fileInternalPath: "index.ts" } },
              },
              message:
                "Boundary violation: '{{from.type}}' may import only the store seam, and only through its public entry (index.ts), not file '{{to.internalPath}}'.",
            },
            // Blocks consume only the store seam, via its public entry.
            {
              from: { element: { type: "blocks" } },
              allow: {
                to: { element: { type: "store", fileInternalPath: "index.ts" } },
              },
              message:
                "Boundary violation: '{{from.type}}' may import only the store seam, and only through its public entry (index.ts), not file '{{to.internalPath}}'.",
            },
            // The store seam (NFR-001) imports no other internal layer. No allow
            // policy → any cross-layer import from store hits the default disallow.
          ],
        },
      ],
    },
  },

  // Same-element sibling imports are allowed automatically by
  // `boundaries/dependencies` (internal deps are skipped); the cross-layer
  // `index.ts`-only rule is enforced by its policies above.
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
      "boundaries/dependencies": "off",
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
