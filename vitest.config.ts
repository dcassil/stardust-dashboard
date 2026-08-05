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
      // Enforced on the structure + overlay primitive layers. The DASH-I-0003
      // `blocks` panels meet the ≥95%-statements acceptance criterion (measured
      // 95.85%, with the selection/session-resolution + edit-routing branches
      // explicitly covered in panelComposition.test.tsx) but are NOT added to the
      // enforced branch:90 gate: the panels' UI branches (tab states, style
      // control kinds) exceed that criterion's scope, and the pre-existing
      // image/upload utilities have their own suites. See DASH-T-0040.
      include: ["src/layout/**", "src/overlays/**"],
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
