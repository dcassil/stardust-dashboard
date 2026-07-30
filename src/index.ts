/**
 * @stardust-cms/dashboard — public entry point.
 *
 * This is the host-dashboard boilerplate for building in-iframe visual editors on
 * top of `@stardust-cms/iframe-adapter`. The real surface (`HostShell`,
 * `ContentStoreAdapter`, `BlockType`, overlay/panel wrappers, theme tokens) is
 * filled in by later tasks; for now this exports a typed package marker so the
 * build produces real ESM + `.d.ts` output.
 *
 * INVARIANT (NFR-001): nothing under `src/**` may import a content store or
 * `versioned-content-engine`. The store enters only through the
 * `ContentStoreAdapter` interface (a later task), and `versioned-content-engine`
 * lives only in the example, never in this package. Enforced by
 * `.dependency-cruiser.cjs`.
 */

export const DASHBOARD_PACKAGE = "@stardust-cms/dashboard" as const;

export type DashboardPackageName = typeof DASHBOARD_PACKAGE;
