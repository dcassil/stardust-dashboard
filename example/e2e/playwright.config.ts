import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

/**
 * Playwright config for the reference-example E2E (SIFR-T-0036, TC-001).
 *
 * Serves the demo pair via `webServer` (the same Vite dev servers `pnpm demo`
 * starts, on explicit localhost origins 5173/5174), then runs the specs headless
 * against the admin at 5173. CI-runnable. Kept OUT of the default unit `test`
 * run (`vitest` globs only `*.test.ts(x)` under src/admin/shared; e2e files use
 * the `.e2e.ts` suffix in this dir), so `pnpm test` never launches a browser.
 */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npx vite --config site/vite.config.ts",
      url: "http://localhost:5174",
      cwd: exampleRoot(),
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npx vite --config admin/vite.config.ts",
      url: "http://localhost:5173",
      cwd: exampleRoot(),
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});

/** The `example/` root (one level up from `example/e2e`). */
function exampleRoot(): string {
  return fileURLToPath(new URL("../", import.meta.url));
}
