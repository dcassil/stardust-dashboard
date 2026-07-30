import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom is available for component tests (later tasks add @testing-library/react suites).
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
