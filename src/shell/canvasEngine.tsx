/**
 * `useCanvasEngine` — the shared scaled-canvas ENGINE (DASH-T-0015), extracted
 * from {@link HostShellCanvas} so it is the SINGLE source of the geometry +
 * store-injection wiring for BOTH the legacy `HostShell` composition AND the
 * DASH-I-0005 region primitives (`Shell.IframeArea`/`Shell.MainContent`).
 *
 * It owns exactly one iframe ref + one `useStardustHost` connection + the ONE
 * re-injection effect (`useReinject`) — so wrapping the canvas as composable
 * regions introduces NO second injection path (the single-re-injection
 * invariant). `CanvasProvider` runs the engine once and publishes its state on
 * {@link CanvasContext}; region primitives read it via {@link useCanvas} rather
 * than re-deriving geometry. Preview state is sourced from the behavior layer's
 * `useOverlayState().mode` (frozen decision #2).
 *
 * BOUNDARY (NFR-001): imports only the published host types, the in-package
 * store/editing/admin/blocks barrels + sibling shell modules — never a concrete
 * store or geometry internal. Part of the shell's canvas-mechanics reuse surface
 * (barrel-exported for the `layout` structure layer).
 */

import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { useStardustHost } from "@stardust-cms/iframe-adapter/host";
import type {
  ConnectionState,
  HostPointer,
  MappedTarget,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import { useContentStore } from "../store";
import { useSelection } from "../editing";
import { useOverlayState } from "../admin";
import type { BlockTypeRegistry } from "../blocks";
import { useInject } from "./injectPipeline.js";
import { useOperationCallbacks } from "./useOperationCallbacks.js";
import { useReinject } from "./useReinject.js";

/** The canvas config the engine + regions need to render the scaled iframe. */
export interface CanvasConfig {
  iframeOrigin: string;
  iframeSrc: string;
  designWidth: number;
  designHeight: number;
  headerOffset: number;
  blockTypes: BlockTypeRegistry;
  previewable: boolean;
}

/** The live engine state published to region primitives via {@link useCanvas}. */
export interface CanvasEngineState {
  iframeRef: RefObject<HTMLIFrameElement>;
  iframeSrc: string;
  designWidth: number;
  designHeight: number;
  previewable: boolean;
  /** Raw fit-to-container scale (for overlay geometry). */
  scale: number;
  /** Scale actually rendered — `1` in preview (native 100%), else `scale`. */
  effectiveScale: number;
  connectionState: ConnectionState;
  targets: MappedTarget[];
  callbacks: OperationCallbacks;
  pointer: HostPointer;
  preview: boolean;
  togglePreview: () => void;
  selectedTargetId: string | null;
  selectedContentId: string | null;
}

/**
 * Run the scaled-canvas wiring: the iframe ref + host connection, the op
 * callbacks, and the SINGLE re-injection effect. Returns a memoized state object
 * (stable identity when nothing changed — narrow re-render for consumers).
 */
export function useCanvasEngine(config: CanvasConfig): CanvasEngineState {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { store, snapshot } = useContentStore();

  const overlay = useOverlayState();
  const preview = overlay.mode === "preview";
  const togglePreview = useCallback((): void => {
    overlay.setMode(preview ? "edit" : "preview");
  }, [overlay, preview]);

  const inject = useInject(store.getSnapshot());
  const { selectedTargetId, selectedContentId } = useSelection();
  const operationCallbacks = useOperationCallbacks(config.blockTypes);

  const { scale, connectionState, targets, callbacks, pointer } = useStardustHost(
    iframeRef,
    {
      origin: config.iframeOrigin,
      headerOffset: config.headerOffset,
      ...(operationCallbacks.onInsert ? { onInsert: operationCallbacks.onInsert } : {}),
      ...(operationCallbacks.onMove ? { onMove: operationCallbacks.onMove } : {}),
      ...(operationCallbacks.onSelect ? { onSelect: operationCallbacks.onSelect } : {}),
    },
  );

  useReinject(connectionState === "connected", snapshot, store, inject);
  const effectiveScale = preview ? 1 : scale;

  return useMemo<CanvasEngineState>(
    () => ({
      iframeRef,
      iframeSrc: config.iframeSrc,
      designWidth: config.designWidth,
      designHeight: config.designHeight,
      previewable: config.previewable,
      scale,
      effectiveScale,
      connectionState,
      targets,
      callbacks,
      pointer,
      preview,
      togglePreview,
      selectedTargetId,
      selectedContentId,
    }),
    [
      config.iframeSrc, config.designWidth, config.designHeight, config.previewable,
      scale, effectiveScale, connectionState, targets, callbacks, pointer,
      preview, togglePreview, selectedTargetId, selectedContentId,
    ],
  );
}

const CanvasContext = createContext<CanvasEngineState | null>(null);

/** Run the engine once and publish its state to descendant region primitives. */
export function CanvasProvider({
  config,
  children,
}: {
  config: CanvasConfig;
  children: ReactNode;
}): ReactNode {
  const state = useCanvasEngine(config);
  return <CanvasContext.Provider value={state}>{children}</CanvasContext.Provider>;
}

/** Read the live canvas engine state. Throws outside a {@link CanvasProvider}. */
export function useCanvas(): CanvasEngineState {
  const value = useContext(CanvasContext);
  if (value === null) {
    throw new Error("useCanvas must be used within a <CanvasProvider>.");
  }
  return value;
}
