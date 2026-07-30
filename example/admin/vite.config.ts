import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Reference-example admin dev server. Fixed port 5173 = the explicit origin the
 * site expects to be embedded by (NFR-002). `strictPort` fails loudly on
 * conflict. `root` is this directory so its `index.html` is the entry.
 *
 * The local `@stardust-cms/dashboard` is the `file:..` link (its `dist/`), and
 * `@stardust-cms/iframe-adapter` + frame-link resolve from node_modules; React
 * is deduped to a single instance across the tree.
 */
export default defineConfig({
  root: __dirname,
  build: { outDir: "../dist/admin", emptyOutDir: true },
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
