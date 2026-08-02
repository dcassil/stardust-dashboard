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

import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
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
  blockTypes,
  renderStatus,
  renderLayout,
  renderOverlayChrome,
  children,
}: HostShellCanvasProps): ReactNode {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { apply, store, snapshot } = useContentStore();

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

  const overlayChrome = renderOverlayChrome({
    targets,
    callbacks,
    scale,
    pointer,
    selectedTargetId,
    selectedContentId,
    editable,
  });

  const canvas = (
    <CanvasFrame
      iframeRef={iframeRef}
      iframeSrc={iframeSrc}
      designWidth={designWidth}
      designHeight={designHeight}
      scale={scale}
      connectionState={connectionState}
      overlayChrome={overlayChrome}
    >
      {children}
    </CanvasFrame>
  );

  const status = renderStatus(connectionState, scale);

  const selection = useMemo<HostSelection>(
    () => ({ selectedTargetId, selectedContentId }),
    [selectedTargetId, selectedContentId],
  );

  return (
    <HostSelectionContext.Provider value={selection}>
      {renderLayout({
        canvas,
        status,
        children,
        selectedTargetId,
        selectedContentId,
      })}
    </HostSelectionContext.Provider>
  );
}
