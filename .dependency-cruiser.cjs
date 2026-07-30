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
    {
      name: "no-circular",
      comment: "Circular dependencies make the module graph hard to reason about.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "Orphan modules (excluding config/entry) are usually dead code.",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)tsconfig\\.",
          "(^|/)(vitest|dependency-cruiser)\\.",
          "(^|/)src/index\\.ts$",
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
