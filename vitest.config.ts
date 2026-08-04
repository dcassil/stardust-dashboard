import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom is available for component tests (later tasks add @testing-library/react suites).
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // DASH-T-0022: register the jest-axe `toHaveNoViolations` matcher globally.
    setupFiles: ["src/testing/setup.ts"],
    coverage: {
      // DASH-T-0022 (structure layer) + DASH-T-0029 (overlay layer): gate
      // coverage on the primitive layers. Computed only under `--coverage` (the
      // `test:coverage` script) so the default `test` gate stays fast; the
      // thresholds enforce the ≥95%-statements acceptance criterion.
      provider: "v8",
      include: ["src/layout/**", "src/overlays/**"],
      // Measure production sources only: drop the suites themselves, and the
      // barrels / compound namespaces (pure re-export surface with no runtime
      // branches) so the metric reflects real primitive logic.
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/layout/index.ts",
        "src/layout/Shell.ts",
        "src/overlays/index.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
