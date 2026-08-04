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
      // DASH-T-0022: gate coverage on the structure layer. Computed only under
      // `--coverage` (the `test:coverage` script) so the default `test` gate
      // stays fast; the thresholds enforce the ≥95%-statements acceptance
      // criterion for `src/layout/**`.
      provider: "v8",
      include: ["src/layout/**"],
      // Measure production sources only: drop the suites themselves, and the
      // compound namespace + barrel (pure re-export surface with no runtime
      // branches) so the metric reflects real region logic.
      exclude: [
        "src/layout/**/*.{test,spec}.{ts,tsx}",
        "src/layout/index.ts",
        "src/layout/Shell.ts",
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
