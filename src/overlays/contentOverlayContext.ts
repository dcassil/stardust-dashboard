/**
 * DASH-T-0023 — the compound context for {@link ContentOverlay}.
 *
 * The compound root provides one instance of this context per mapped child, so
 * its sub-parts ({@link ContentOverlay.SelectionRing} / `.Actions` and the
 * standalone action primitives, landing in DASH-T-0024…0027) can position and
 * wire themselves without prop-drilling. The value is intentionally minimal and
 * fully typed (NFR-002): the current `target`, the current `child`, and the
 * normalized {@link EditingRef} the DASH-I-0001 controller actions key off.
 *
 * Sub-parts read this via {@link useContentOverlayContext}, which returns `null`
 * outside a `<ContentOverlay>` — each primitive falls back to an explicit
 * `ref`/`target` prop in that case, so it stays usable standalone.
 */

import { createContext, useContext } from "react";
import type { MappedChild, MappedTarget } from "@stardust-cms/iframe-adapter/host";
import type { EditingRef } from "../editing";

/** The per-child value carried by {@link ContentOverlayContext}. */
export interface ContentOverlayContextValue {
  /** The mapped target this overlay renders chrome for. */
  readonly target: MappedTarget;
  /** The mapped child the current sub-parts position over. */
  readonly child: MappedChild;
  /** The controller-facing ref for this item (target + content id). */
  readonly ref: EditingRef;
}

/**
 * Null outside a `<ContentOverlay>`; a per-child value inside it. Not exported
 * from the package root — consumers reach it only through the compound parts.
 */
export const ContentOverlayContext =
  createContext<ContentOverlayContextValue | null>(null);

/**
 * Read the nearest {@link ContentOverlayContext}, or `null` when a primitive is
 * rendered outside `<ContentOverlay>` (it should then use its own `ref`/`target`
 * prop). Kept as a focused hook so sub-parts subscribe to the compound value
 * only, not to unrelated selection state (NFR-006).
 */
export function useContentOverlayContext(): ContentOverlayContextValue | null {
  return useContext(ContentOverlayContext);
}
