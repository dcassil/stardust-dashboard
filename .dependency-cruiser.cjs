/**
 * dependency-cruiser configuration for @stardust-cms/dashboard.
 *
 * Load-bearing guarantee for NFR-001 (Decoupling): the dashboard shell under
 * `src/**` must stay content-store-agnostic. It may depend on the host
 * primitives (`@stardust-cms/iframe-adapter`), the transport
 * (`frame-link` / `frame-link-react`), and React — but NEVER on a concrete
 * content store. The store enters only via the `ContentStoreAdapter` interface
 * (defined in a later task); `versioned-content-engine` appears only in the
 * example, never in `src/`.
 *
 * Every later task in SIFR-I-0007 inherits this boundary.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "shell-no-versioned-content-engine",
      comment:
        "NFR-001: the store-agnostic shell (src/**) must not import versioned-content-engine. " +
        "VCE is a reference store adapter that lives only in the example, wired through the " +
        "ContentStoreAdapter interface — never a dependency of this package.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "(^|/)versioned-content-engine($|/)" },
    },
    {
      name: "shell-no-content-store",
      comment:
        "NFR-001: the shell (src/**) must not import a concrete content store, a @demo/* store, " +
        "or the SIFR demo. The store is injected via the ContentStoreAdapter interface only.",
      severity: "error",
      from: { path: "^src/" },
      to: {
        path: "(^|/)@demo/|(^|/)demo/|(^|/)content-store($|/)|(^|/)@stardust-cms/[^/]*content-store",
      },
    },
    /* ---- Module boundaries (mirror eslint-plugin-boundaries) ------------- */
    {
      name: "store-no-internal-layers",
      comment:
        "NFR-001: the store seam (src/store/**) is the decoupling substrate — it " +
        "must not depend on any other internal layer (editing/admin/blocks/overlays/shell). " +
        "It imports only published host/protocol types.",
      severity: "error",
      from: { path: "^src/store/" },
      to: {
        path: "^src/(editing|admin|blocks|overlays|shell)/",
        pathNot: "\\.(test|spec)\\.[tj]sx?$",
      },
    },
    {
      name: "editing-only-store",
      comment:
        "DASH-T-0001 boundary: the editing behavior layer (src/editing/**) may " +
        "import ONLY the store seam (via its public entry) and external host " +
        "ref/op types. It must not reach into admin/blocks/overlays/shell.",
      severity: "error",
      from: { path: "^src/editing/", pathNot: "\\.(test|spec)\\.[tj]sx?$" },
      to: { path: "^src/(admin|blocks|overlays|shell)/" },
    },
    {
      name: "admin-only-store-editing",
      comment:
        "DASH-T-0001 boundary: the admin behavior layer (src/admin/**) may import " +
        "ONLY the store seam and the editing layer (via their public entries). It " +
        "must not reach into blocks/overlays/shell.",
      severity: "error",
      from: { path: "^src/admin/", pathNot: "\\.(test|spec)\\.[tj]sx?$" },
      to: { path: "^src/(blocks|overlays|shell)/" },
    },
    {
      name: "overlays-only-store",
      comment:
        "The overlays layer may only import the store seam (via its public entry). " +
        "It must not reach into blocks or shell.",
      severity: "error",
      from: { path: "^src/overlays/", pathNot: "\\.(test|spec)\\.[tj]sx?$" },
      to: { path: "^src/(blocks|shell)/" },
    },
    {
      name: "blocks-only-store",
      comment:
        "The blocks layer may only import the store seam (via its public entry). " +
        "It must not reach into overlays or shell.",
      severity: "error",
      from: { path: "^src/blocks/", pathNot: "\\.(test|spec)\\.[tj]sx?$" },
      to: { path: "^src/(overlays|shell)/" },
    },
    {
      name: "layout-public-entry-only",
      comment:
        "REQ-007 / NFR-001 (the 'level 1' proof): the turnkey shell + region " +
        "primitives (src/layout/**) compose every OTHER layer ONLY through its " +
        "public barrel (index.ts) — never a package-private module. This is the " +
        "load-bearing guarantee that the default admin (AdminShell) needs no " +
        "package internals to rebuild. Same-layer sibling imports are unaffected " +
        "(the `to` pattern excludes src/layout/).",
      severity: "error",
      from: { path: "^src/layout/", pathNot: "\\.(test|spec)\\.[tj]sx?$" },
      to: {
        path: "^src/(store|editing|admin|blocks|overlays|shell)/",
        pathNot: "^src/(store|editing|admin|blocks|overlays|shell)/index\\.ts$",
      },
    },
    {
      name: "no-circular",
      comment: "Circular dependencies make the module graph hard to reason about.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "Orphan modules (excluding config/entry/tests) are usually dead code.",
      severity: "error",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)tsconfig\\.",
          "(^|/)(vitest|dependency-cruiser)\\.",
          "(^|/)src/index\\.ts$",
          // Vitest setup/harness files are entries (loaded via `setupFiles`),
          // not dead code — nothing imports them through the module graph.
          "(^|/)src/testing/",
          // Test files are graph leaves (nothing imports a test) — not dead code.
          "\\.(test|spec)\\.[tj]sx?$",
          "\\.css$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
