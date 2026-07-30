import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Reference-example site dev server. Fixed port 5174 so the admin can embed it
 * at a known, explicit origin (NFR-002). `strictPort` fails loudly rather than
 * drifting to a port the admin isn't expecting. `root` is this directory so the
 * `index.html` here is the entry.
 */
export default defineConfig({
  root: __dirname,
  // Distinct outDir so `demo:build` emits site + admin side by side (the admin
  // build below writes to ../dist/admin), rather than overwriting one another.
  build: { outDir: "../dist/site", emptyOutDir: true },
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  // React must be a single instance across the app; the published adapter +
  // frame-link-react resolve from node_modules normally.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
