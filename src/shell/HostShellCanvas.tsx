/**
 * `HostShellCanvas` — the store-injection + scaled-iframe canvas of
 * {@link HostShell}. Lives INSIDE `FrameLinkProvider` (so `useSendElements`'s
 * `useSend` has transport) and INSIDE `StoreProvider` (so `useContentStore()`
 * surfaces the injected adapter + snapshot). Extracted from `HostShell.tsx` so
 * both modules stay under the size limit. Not part of the public API — reached
 * only via {@link HostShell}.
 *
 * INVARIANT (NFR-001): imports ONLY the published host types, the in-package
 * store seam (via its public barrel), and sibling shell modules. It never names a
 * concrete store or `versioned-content-engine`.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useStardustHost } from "@stardust-cms/iframe-adapter/host";
import type { ConnectionState } from "@stardust-cms/iframe-adapter/host";
import { useContentStore } from "../store";
import type { BlockTypeRegistry } from "../blocks";
import { HostSelectionContext } from "./HostSelectionContext.js";
import { CanvasFrame } from "./CanvasFrame.js";
import { useInject } from "./injectPipeline.js";
import { useHostOps } from "./useHostOps.js";
import { useReinject } from "./useReinject.js";
import type {
  HostSelection,
  HostShellLayoutParts,
  OverlayChromeParts,
} from "./hostShellTypes.js";

export interface HostShellCanvasProps {
  iframeOrigin: string;
  iframeSrc: string;
  designWidth: number;
  designHeight: number;
  headerOffset: number;
  editable: boolean;
  previewable: boolean;
  blockTypes: BlockTypeRegistry;
  renderStatus: (state: ConnectionState, scale: number) => ReactNode;
  renderLayout: (parts: HostShellLayoutParts) => ReactNode;
  renderOverlayChrome: (parts: OverlayChromeParts) => ReactNode;
  children: ReactNode;
}

export function HostShellCanvas({
  iframeOrigin,
  iframeSrc,
  designWidth,
  designHeight,
  headerOffset,
  editable,
  previewable,
  blockTypes,
  renderStatus,
  renderLayout,
  renderOverlayChrome,
  children,
}: HostShellCanvasProps): ReactNode {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { apply, store, snapshot } = useContentStore();

  // Preview mode: hide the editor sidebar, render the site at native 100%
  // scale, and disable the edit overlays. Toggled by the dog-ear control.
  const [preview, setPreview] = useState(false);
  const togglePreview = useCallback(() => {
    setPreview((current) => !current);
  }, []);

  const inject = useInject(store.getSnapshot());
  const { operationCallbacks, selectedTargetId, selectedContentId } =
    useHostOps(apply, blockTypes);

  const { scale, connectionState, targets, callbacks, pointer } = useStardustHost(
    iframeRef,
    {
      origin: iframeOrigin,
      headerOffset,
      ...(operationCallbacks.onInsert
        ? { onInsert: operationCallbacks.onInsert }
        : {}),
      ...(operationCallbacks.onMove
        ? { onMove: operationCallbacks.onMove }
        : {}),
      ...(operationCallbacks.onSelect
        ? { onSelect: operationCallbacks.onSelect }
        : {}),
    },
  );

  useReinject(connectionState === "connected", snapshot, store, inject);

  // In preview the site renders at native 100% and the edit overlays + the
  // palette/side-panel layer are suppressed (view-only).
  const effectiveScale = preview ? 1 : scale;
  const overlayChrome = buildOverlayChrome(preview, renderOverlayChrome, {
    targets, callbacks, scale, pointer,
    selectedTargetId, selectedContentId, editable,
  });

  const canvas = (
    <CanvasFrame
      iframeRef={iframeRef}
      iframeSrc={iframeSrc}
      designWidth={designWidth}
      designHeight={designHeight}
      scale={effectiveScale}
      connectionState={connectionState}
      overlayChrome={overlayChrome}
      previewable={previewable}
      preview={preview}
      onTogglePreview={togglePreview}
    >
      {preview ? null : children}
    </CanvasFrame>
  );

  const status = renderStatus(connectionState, effectiveScale);

  const selection = useMemo<HostSelection>(
    () => ({ selectedTargetId, selectedContentId }),
    [selectedTargetId, selectedContentId],
  );

  return (
    <HostSelectionContext.Provider value={selection}>
      {composeShellBody(preview, canvas, renderLayout, {
        canvas,
        status,
        children,
        selectedTargetId,
        selectedContentId,
      })}
    </HostSelectionContext.Provider>
  );
}

/** Build the overlay chrome — suppressed (null) in preview, view-only. */
function buildOverlayChrome(
  preview: boolean,
  render: (parts: OverlayChromeParts) => ReactNode,
  parts: OverlayChromeParts,
): ReactNode {
  return preview ? null : render(parts);
}

/**
 * Compose the shell body: in preview, a package-owned full-bleed container
 * (the consumer's `renderLayout` — and its sidebar/status — is bypassed so the
 * page expands with no demo-side changes; the dog-ear inside `canvas` exits);
 * otherwise the consumer's `renderLayout`.
 */
function composeShellBody(
  preview: boolean,
  canvas: ReactNode,
  renderLayout: (parts: HostShellLayoutParts) => ReactNode,
  parts: HostShellLayoutParts,
): ReactNode {
  if (preview) return <div style={PREVIEW_LAYOUT_STYLE}>{canvas}</div>;
  return renderLayout(parts);
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
