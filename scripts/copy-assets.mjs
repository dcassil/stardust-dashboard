// Copies non-TS assets (CSS tokens) that `tsc` does not emit into `dist/`,
// preserving their path under `src/` so the package `exports` map resolves.
import { cp, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(dirname(fileURLToPath(import.meta.url)), "..");

const assets = [
  ["src/tokens/tokens.css", "dist/tokens/tokens.css"],
  ["src/tokens/theme.css", "dist/tokens/theme.css"],
];

for (const [from, to] of assets) {
  const dest = path.join(root, to);
  await mkdir(dirname(dest), { recursive: true });
  await cp(path.join(root, from), dest);
  console.log(`copied ${from} -> ${to}`);
}
