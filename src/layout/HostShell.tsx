/**
 * `HostShell` — the configurable host-dashboard shell (SIFR-I-0007 REQ-003),
 * re-implemented (DASH-T-0020) as a THIN WRAPPER over the turnkey
 * {@link AdminShell} region substrate.
 *
 * Since DASH-T-0019 the default admin is composed entirely from the public
 * region primitives (`Shell.Root` + the eight regions). `HostShell` is now just
 * the opinionated host-editor CONFIGURATION of that substrate: it mounts the
 * three ambient providers the regions read from and hands the legacy render-props
 * onto the region seams. It owns no layout of its own (Option B — a SINGLE layout
 * path, no parallel legacy renderer):
 *
 *  1. `FrameLinkProvider` — the frame-link transport, `targetOrigin` pinned to the
 *     explicit `iframeOrigin` (never `"*"`, NFR-002), memoized so the connection
 *     is not torn down each render.
 *  2. `AdminProvider(store)` — the DASH-I-0001 behavior layer (composes
 *     `StoreProvider` from the injected {@link ContentStoreAdapter}, the editing
 *     controller, the UI-state controllers, and the command/extension registries).
 *  3. `CanvasProvider(config)` — the shared scaled-canvas ENGINE (DASH-T-0015):
 *     the ONE iframe ref + host connection + the SINGLE re-injection effect. Every
 *     region reads it via `useCanvas` — there is no second injection path.
 *
 * ## How the legacy render-props map onto the substrate
 *
 *  - `renderStatus(state, scale)` → the `topbar` slot. Default: the bundled
 *    {@link ConnectionStatus} strip (`.admin-status`). A custom `renderStatus`
 *    replaces it wholesale.
 *  - `renderOverlayChrome(parts)` → the `OverlayLayer` child (via `AdminShell`'s
 *    additive `overlay` prop). Default: the bundled `Overlays`. Suppressed in
 *    preview by `OverlayLayer` itself (frozen decision #2).
 *  - `children` → rendered in the SAME `OverlayLayer`, after the chrome.
 *  - `renderLayout(parts)` → Option B THIN SHIM: when supplied it REPLACES the
 *    `AdminShell` arrangement entirely and receives the same
 *    {@link HostShellLayoutParts}. DOCUMENTED CAVEAT: a consumer hand-rolling the
 *    layout this way OWNS the region behaviors (ModalHost a11y / CommandRegion /
 *    responsive collapse) — those live in the region primitives the default
 *    `AdminShell` composes. When omitted, `HostShell` renders `<AdminShell>` and
 *    all region behaviors are intact.
 *
 * Preview mode (the dog-ear) is sourced from `useOverlayState().mode` inside the
 * engine; entering preview bypasses BOTH `AdminShell` and a custom `renderLayout`
 * for a full-bleed, native-scale canvas (parity with the shipped 0.1.6 behavior).
 *
 * INVARIANT (NFR-001): this module imports ONLY React, the transport
 * (`frame-link-react`), published host types, the `admin`/`shell` public barrels,
 * and `layout` siblings. It never names a concrete store or
 * `versioned-content-engine`. Enforced by dependency-cruiser +
 * `AdminShell.boundary.test.ts`.
 */

import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { FrameLinkProvider } from "frame-link-react";
import { AdminProvider } from "../admin";
import type { BlockTypeRegistry } from "../blocks";
import { CanvasProvider, useCanvas } from "../shell";
import type { CanvasConfig } from "../shell";
import { AdminShell } from "./AdminShell.js";
import { IframeArea } from "./IframeArea.js";
import { OverlayLayer } from "./OverlayLayer.js";
import { ConnectionStatus } from "./ConnectionStatus.js";
import { HostSelectionContext } from "./HostSelectionContext.js";
import { defaultRenderOverlayChrome } from "./defaultSlots.js";
import { useRegisterDefaultPanels } from "./hostDefaultPanels.js";
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_IFRAME_ORIGIN,
  EMPTY_BLOCK_TYPES,
} from "./hostShellTypes.js";
import type {
  HostSelection,
  HostShellLayoutParts,
  HostShellProps,
  OverlayChromeParts,
} from "./hostShellTypes.js";

/**
 * The configurable host-dashboard shell. Mounts the three ambient providers and
 * delegates the actual composition to {@link HostShellBody} (which reads the
 * canvas engine) so the layout logic lives INSIDE `CanvasProvider`.
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
    renderLayout,
    renderOverlayChrome = defaultRenderOverlayChrome,
    children,
  } = props;

  const resolvedSrc = iframeSrc ?? `${iframeOrigin}/`;

  // `FrameLinkProvider` recreates (and destroys) its instance when `options`
  // identity changes; memoize so the connection survives re-renders.
  const frameLinkOptions = useMemo(
    () => ({ targetOrigin: iframeOrigin }),
    [iframeOrigin],
  );

  const canvasConfig = useMemo<CanvasConfig>(
    () => ({
      iframeOrigin,
      iframeSrc: resolvedSrc,
      designWidth,
      designHeight,
      headerOffset,
      blockTypes,
      previewable,
    }),
    [
      iframeOrigin,
      resolvedSrc,
      designWidth,
      designHeight,
      headerOffset,
      blockTypes,
      previewable,
    ],
  );

  return (
    <FrameLinkProvider options={frameLinkOptions}>
      <AdminProvider store={store}>
        <CanvasProvider config={canvasConfig}>
          <HostShellBody
            iframeOrigin={iframeOrigin}
            editable={editable}
            blockTypes={blockTypes}
            renderStatus={renderStatus}
            renderLayout={renderLayout}
            renderOverlayChrome={renderOverlayChrome}
          >
            {children}
          </HostShellBody>
        </CanvasProvider>
      </AdminProvider>
    </FrameLinkProvider>
  );
}

interface HostShellBodyProps {
  iframeOrigin: string;
  editable: boolean;
  blockTypes: BlockTypeRegistry;
  renderStatus: HostShellProps["renderStatus"];
  renderLayout: HostShellProps["renderLayout"];
  renderOverlayChrome: (parts: OverlayChromeParts) => ReactNode;
  children: ReactNode;
}

/**
 * Reads the shared canvas engine and composes the substrate: builds the status +
 * overlay chrome, publishes the shell-tracked selection, and picks the single
 * layout path (preview full-bleed → custom `renderLayout` → default `AdminShell`).
 */
function HostShellBody({
  iframeOrigin,
  editable,
  blockTypes,
  renderStatus,
  renderLayout,
  renderOverlayChrome,
  children,
}: HostShellBodyProps): ReactNode {
  // DASH-T-0038: register the bundled default sidebar (palette + content panel).
  useRegisterDefaultPanels(blockTypes, editable);

  const {
    connectionState,
    effectiveScale,
    scale,
    targets,
    callbacks,
    pointer,
    preview,
    selectedTargetId,
    selectedContentId,
  } = useCanvas();

  const status = renderStatus ? (
    renderStatus(connectionState, effectiveScale)
  ) : (
    <ConnectionStatus
      state={connectionState}
      scale={effectiveScale}
      siteOrigin={iframeOrigin}
    />
  );

  const overlayChrome = renderOverlayChrome({
    targets,
    callbacks,
    scale,
    pointer,
    selectedTargetId,
    selectedContentId,
    editable,
  });

  // The region canvas — used for the preview full-bleed view and the custom
  // `renderLayout` path. In the default `AdminShell` path the canvas is built by
  // `MainContent` internally, so this node is only mounted when one of those two
  // paths is taken (never two iframes at once).
  const canvas = (
    <IframeArea>
      <OverlayLayer>
        {overlayChrome}
        {children}
      </OverlayLayer>
    </IframeArea>
  );

  const selection = useMemo<HostSelection>(
    () => ({ selectedTargetId, selectedContentId }),
    [selectedTargetId, selectedContentId],
  );

  const overlay = (
    <>
      {overlayChrome}
      {children}
    </>
  );

  const body = composeBody({
    preview,
    canvas,
    renderLayout,
    parts: { canvas, status, children, selectedTargetId, selectedContentId },
    overlay,
    status,
  });

  return (
    <HostSelectionContext.Provider value={selection}>
      {body}
    </HostSelectionContext.Provider>
  );
}

interface ComposeBodyArgs {
  preview: boolean;
  canvas: ReactNode;
  renderLayout: HostShellProps["renderLayout"];
  parts: HostShellLayoutParts;
  overlay: ReactNode;
  status: ReactNode;
}

/**
 * Pick the SINGLE layout path (Option B):
 *  - preview → a package-owned full-bleed container (bypasses both `AdminShell`
 *    and any custom `renderLayout`; the dog-ear inside `canvas` exits);
 *  - a custom `renderLayout` → the consumer's arrangement (owns region behaviors);
 *  - otherwise → the turnkey `AdminShell`, with `renderStatus` on the `topbar`
 *    slot and `renderOverlayChrome` + `children` as the `OverlayLayer` content.
 */
function composeBody({
  preview,
  canvas,
  renderLayout,
  parts,
  overlay,
  status,
}: ComposeBodyArgs): ReactNode {
  if (preview) {
    return <div style={PREVIEW_LAYOUT_STYLE}>{canvas}</div>;
  }
  if (renderLayout) {
    return renderLayout(parts);
  }
  return <AdminShell slots={{ topbar: () => status }} overlay={overlay} />;
}

/** Full-bleed, scrollable, centered container for preview mode. */
const PREVIEW_LAYOUT_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  overflow: "auto",
  display: "flex",
  justifyContent: "center",
  background: "#ffffff",
  zIndex: 40,
};
