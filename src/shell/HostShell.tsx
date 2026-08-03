/**
 * `HostShell` — the configurable host-dashboard shell (SIFR-I-0007 REQ-003,
 * Detailed Design §3).
 *
 * This is the reusable generalization of the SIFR demo's `App` + `HostCanvas`
 * composition. The demo hard-coded its geometry/origin in `config.ts`, imported a
 * concrete `@demo/shared/store`, and split the store-injection pipeline across
 * `Editing` / `StoreBridge` / `useContentStore`. `HostShell` collapses that into
 * one component whose every former constant is a **prop** (with a sensible
 * default) and whose store arrives by **injection** as a {@link ContentStoreAdapter}
 * — so a consumer installs the package, hands in a store + iframe config, and
 * gets a working in-iframe editor.
 *
 * ## What it owns
 *
 *  1. `FrameLinkProvider` — the frame-link transport, with `targetOrigin` set to
 *     the explicit `iframeOrigin` (never `"*"`, NFR-002). Kept module-stable via
 *     a ref so the connection is not torn down on every render.
 *  2. `StoreProvider(store)` — the injected {@link ContentStoreAdapter}, exposing
 *     the live snapshot + `apply` to the tree via `useContentStore()`.
 *  3. The scaled iframe canvas + the ops → store → injection pipeline, both owned
 *     by {@link HostShellCanvas} (which lives inside the two providers).
 *
 * ## Extension seams (kept minimal per the initiative Non-Goal on plugin systems)
 *
 *  - `renderStatus(state, scale)` — controls the connection-status region.
 *    Default: the bundled {@link ConnectionStatus} strip.
 *  - `renderLayout(parts)` — controls the arrangement of canvas / status /
 *    children. Default: the demo's left-canvas / right-panel-column grid.
 *  - `renderOverlayChrome(parts)` — controls the overlay chrome. Default: the
 *    bundled {@link Overlays}.
 *  - `children` — the overlay + palette + side-panel layer, rendered over the
 *    scaled canvas.
 *
 * The public config defaults + prop/slot types live in `./hostShellTypes.js`; the
 * selection context + {@link useHostSelection} in `./HostSelectionContext.js`; the
 * canvas + its pipeline in `./HostShellCanvas.js` and its sibling hooks. All are
 * re-exported through `shell/index.js` so the public API is byte-for-byte unchanged.
 *
 * INVARIANT (NFR-001): this module imports ONLY `frame-link-react`, React, and
 * in-package modules (the store seam via its public barrel + sibling shell files).
 * It never names a concrete store or `versioned-content-engine`. Enforced by
 * dependency-cruiser.
 */

import { useMemo } from "react";
import type { ReactNode } from "react";
import { FrameLinkProvider } from "frame-link-react";
import type { ConnectionState } from "@stardust-cms/iframe-adapter/host";
import { StoreProvider } from "../store";
import { ConnectionStatus } from "./ConnectionStatus.js";
import { HostShellCanvas } from "./HostShellCanvas.js";
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_IFRAME_ORIGIN,
  EMPTY_BLOCK_TYPES,
} from "./hostShellTypes.js";
import type { HostShellProps } from "./hostShellTypes.js";
import {
  defaultRenderLayout,
  defaultRenderOverlayChrome,
} from "./defaultSlots.js";

/**
 * The configurable host-dashboard shell. See the module doc for the full
 * composition. Wraps the canvas in `FrameLinkProvider` + `StoreProvider`.
 */
export function HostShell(props: HostShellProps): ReactNode {
  const {
    iframeOrigin = DEFAULT_IFRAME_ORIGIN,
    iframeSrc,
    designWidth = DEFAULT_DESIGN_WIDTH,
    designHeight = DEFAULT_DESIGN_HEIGHT,
    headerOffset = 0,
    store,
    editable = true,
    previewable = true,
    blockTypes = EMPTY_BLOCK_TYPES,
    renderStatus,
    renderLayout = defaultRenderLayout,
    renderOverlayChrome = defaultRenderOverlayChrome,
    children,
  } = props;

  const resolvedSrc = iframeSrc ?? `${iframeOrigin}/`;

  // `FrameLinkProvider` recreates (and destroys) its frame-link instance
  // whenever the `options` object identity changes, which would tear down the
  // connection on every render. Memoize the options so its identity is stable
  // and only changes when the target origin actually changes.
  const frameLinkOptions = useMemo(
    () => ({ targetOrigin: iframeOrigin }),
    [iframeOrigin],
  );

  const resolvedRenderStatus = useMemo(
    () =>
      renderStatus ??
      ((state: ConnectionState, scale: number): ReactNode => (
        <ConnectionStatus
          state={state}
          scale={scale}
          siteOrigin={iframeOrigin}
        />
      )),
    [renderStatus, iframeOrigin],
  );

  return (
    <FrameLinkProvider options={frameLinkOptions}>
      <StoreProvider store={store}>
        <div className="admin-root">
          <HostShellCanvas
            iframeOrigin={iframeOrigin}
            iframeSrc={resolvedSrc}
            designWidth={designWidth}
            designHeight={designHeight}
            headerOffset={headerOffset}
            editable={editable}
            previewable={previewable}
            blockTypes={blockTypes}
            renderStatus={resolvedRenderStatus}
            renderLayout={renderLayout}
            renderOverlayChrome={renderOverlayChrome}
          >
            {children}
          </HostShellCanvas>
        </div>
      </StoreProvider>
    </FrameLinkProvider>
  );
}
