/**
 * Explicit config for the reference-example admin (formerly the demo's
 * `config.ts` constants, now passed to `HostShell` as props — SIFR-I-0007
 * Detailed Design §3). Admin runs at :5173 and embeds the site at :5174 — the
 * same explicit cross-origin split as the SIFR demo (NFR-002, never `"*"`).
 */

/** The embedded site's explicit origin. */
export const SITE_ORIGIN: string =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ??
  "http://localhost:5174";

/** The full URL loaded into the preview iframe. */
export const SITE_URL = `${SITE_ORIGIN}/`;

/** The site's intrinsic design width (unscaled px) — drives the host scale. */
export const DESIGN_WIDTH = 924;

/** The site document height (unscaled px) the canvas reserves × scale. */
export const DESIGN_HEIGHT = 1100;
