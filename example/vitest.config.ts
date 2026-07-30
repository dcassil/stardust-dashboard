import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    // Unit + integration tests only; the Playwright e2e (`e2e/*.e2e.ts`) is run
    // separately via `pnpm demo:e2e` and must never be picked up here.
    include: ["{src,admin,shared}/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
