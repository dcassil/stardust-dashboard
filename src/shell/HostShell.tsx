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
 *  3. The scaled iframe canvas + `useStardustHost(iframeRef, { origin, headerOffset })`
 *     — the frame-link handshake, geometry/scroll streaming, and scale tracking.
 *  4. The ops → store → injection pipeline: every overlay/panel intent becomes a
 *     {@link HostContentOp}, is applied through the store, and the returned
 *     snapshot is pushed into the iframe via `cms/sendElements`.
 *
 * ## Extension seams (kept minimal per the initiative Non-Goal on plugin systems)
 *
 *  - `renderStatus(state, scale)` — controls the connection-status region.
 *    Default: the bundled {@link ConnectionStatus} strip.
 *  - `renderLayout(parts)` — controls the arrangement of canvas / status /
 *    children. Default: the demo's left-canvas / right-panel-column grid.
 *  - `children` — the overlay + palette + side-panel layer, rendered over the
 *    scaled canvas. Later tasks (SIFR-T-0034 BlockType palette/side-panel,
 *    SIFR-T-0035 overlay chrome slots) plug in here; today a consumer passes the
 *    published overlay primitives (wrapped minimally) as children.
 *
 * INVARIANT (NFR-001): this module imports ONLY the published host/protocol
 * types, `frame-link-react`, React, and the in-package store seam. It never names
 * a concrete store or `versioned-content-engine`. Enforced by dependency-cruiser.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FrameLinkProvider } from "frame-link-react";
import { useStardustHost } from "@stardust-cms/iframe-adapter/host";
import type {
  ConnectionState,
  ContentLocation,
  InsertOp,
  MappedTarget,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import {
  StoreProvider,
  useContentStore,
} from "../store/StoreProvider.js";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "../store/adapter.js";
import type { BlockTypeRegistry } from "../blocks/BlockType.js";
import { findBlockType } from "../blocks/BlockType.js";
import { Overlays } from "../overlays/Overlays.js";
import { ConnectionStatus } from "./ConnectionStatus.js";
import { useSendElements } from "./useSendElements.js";

/* -------------------------------------------------------------------------- */
/* Defaults (formerly demo/admin/src/config.ts constants)                     */
/* -------------------------------------------------------------------------- */

/** Default embedded-site origin. Consumers override via `iframeOrigin`. */
export const DEFAULT_IFRAME_ORIGIN = "http://localhost:5174";
/** Default intrinsic design width (unscaled px) the iframe is laid out at. */
export const DEFAULT_DESIGN_WIDTH = 1024;
/** Default iframe document height (unscaled px); the canvas reserves this × scale. */
export const DEFAULT_DESIGN_HEIGHT = 900;

/** Stable empty registry used when `blockTypes` is omitted (no crash, no defaults). */
const EMPTY_BLOCK_TYPES: BlockTypeRegistry = [];

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The host state handed to a custom {@link HostShellProps.renderOverlayChrome}
 * (SIFR-T-0035, REQ-005). Everything the overlay layer needs to wrap the
 * published primitives: the mapped targets, the edit-intent callbacks, the live
 * scale, and the shell-tracked selection. Passing a `renderOverlayChrome` lets a
 * consumer restyle or replace the overlay chrome without forking; the default
 * renders the bundled {@link Overlays}.
 */
export interface OverlayChromeParts {
  /** Targets mapped into host coordinates — `useStardustHost().targets`. */
  targets: MappedTarget[];
  /** Edit-intent callbacks bundled by the host, for the overlay primitives. */
  callbacks: OperationCallbacks;
  /** Current iframe render scale. */
  scale: number;
  /** The shell-tracked selected target id (drives the target selected ring). */
  selectedTargetId: string | null;
  /** The shell-tracked selected content id (drives the item selected ring). */
  selectedContentId: string | null;
}

/** The composed regions handed to a custom {@link HostShellProps.renderLayout}. */
export interface HostShellLayoutParts {
  /** The scaled iframe canvas with the overlay layer (`children`) mounted over it. */
  canvas: ReactNode;
  /** The connection-status region (the resolved `renderStatus` output). */
  status: ReactNode;
  /** The overlay/palette/side-panel layer passed to `HostShell` as `children`. */
  children: ReactNode;
}

export interface HostShellProps {
  /**
   * The embedded site's explicit origin — BOTH the iframe `src` origin and the
   * `origin` / `targetOrigin` handed to `useStardustHost` and `FrameLinkProvider`.
   * @default {@link DEFAULT_IFRAME_ORIGIN}
   */
  iframeOrigin?: string;
  /**
   * Full URL loaded into the preview iframe. Defaults to `${iframeOrigin}/`.
   * Its origin MUST match `iframeOrigin` for the frame-link handshake.
   */
  iframeSrc?: string;
  /**
   * The intrinsic design width (unscaled px) the iframe document is laid out at.
   * `useStardustHost` derives `scale` from container width / this width.
   * @default {@link DEFAULT_DESIGN_WIDTH}
   */
  designWidth?: number;
  /**
   * The iframe document height (unscaled px). The canvas reserves
   * `designHeight × scale` on screen.
   * @default {@link DEFAULT_DESIGN_HEIGHT}
   */
  designHeight?: number;
  /**
   * Extra vertical offset (px) subtracted from streamed scroll geometry — for a
   * fixed header inside the iframe document. Forwarded to `useStardustHost`.
   * @default 0
   */
  headerOffset?: number;
  /** The injected content store. The ONLY place a concrete store enters. */
  store: ContentStoreAdapter;
  /**
   * The block-type registry (SIFR-T-0034, REQ-004). Drives per-type insert
   * defaults (via each block's `defaultValue()`) and, when the bundled
   * {@link Palette}/{@link SidePanel} are composed as `children`, the palette
   * entries and side-panel field editors. Omitted → an empty registry (no
   * crash, no seeded insert defaults); the demo passes its own `text`/`image`.
   * @default [] (empty registry)
   */
  blockTypes?: BlockTypeRegistry;
  /**
   * Render-prop for the connection-status region, given the live connection
   * state + scale. Default: the bundled {@link ConnectionStatus} strip.
   */
  renderStatus?: (state: ConnectionState, scale: number) => ReactNode;
  /**
   * Render-prop controlling the arrangement of the composed regions. Default:
   * the demo's left-canvas / right-panel-column grid (status above the canvas).
   */
  renderLayout?: (parts: HostShellLayoutParts) => ReactNode;
  /**
   * Render-prop for the overlay chrome layered over the scaled canvas
   * (SIFR-T-0035, REQ-005). Given the mapped targets, host callbacks, scale, and
   * selection, it returns the overlay layer. Default: the bundled
   * {@link Overlays} wrapping the published `TargetAreaOverlay`/`ContentItemOverlay`
   * primitives with the `ov-*` classes + a store-wired delete button. Override to
   * restyle (custom class names) or replace the chrome (custom `renderItemChrome`)
   * without forking. Rendered before `children` in the overlay layer.
   */
  renderOverlayChrome?: (parts: OverlayChromeParts) => ReactNode;
  /**
   * The palette / side-panel (and any extra overlay) layer, rendered over the
   * scaled canvas after the overlay chrome. Block-type-driven palette/side-panel
   * plug in here.
   */
  children?: ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Snapshot re-injection helpers (ported from demo useContentStore)           */
/* -------------------------------------------------------------------------- */

/** The highest occupied index per target, from a snapshot. */
function maxIndexByTarget(snapshot: ContentSnapshot): Map<string, number> {
  const max = new Map<string, number>();
  for (const p of snapshot) {
    max.set(p.targetId, Math.max(max.get(p.targetId) ?? -1, p.index));
  }
  return max;
}

/** An empty content payload used to blank an orphaned trailing slot. */
function blankPayload(targetId: string, index: number): ContentPayload {
  return {
    targetId,
    contentId: `__blank-${targetId}-${index}`,
    index,
    content: { id: `__blank-${targetId}-${index}`, type: "text", value: "" },
  };
}

/**
 * Merge the block registry's `defaultValue()` for a newly inserted block into the
 * insert payload. Replaces the demo's hard-coded text/image switch — the registry
 * is now the single source of per-type insert defaults. A block type with no
 * `defaultValue` (or no matching registry entry) seeds nothing. A bare-value
 * result is written to `payload.value`; a partial-`CmsContent` result is spread
 * over the payload so a block can seed more than `value` (e.g. `column`).
 */
function applyInsertDefaults(
  blockTypes: BlockTypeRegistry,
  payload: InsertOp["payload"],
): InsertOp["payload"] {
  const blockType = findBlockType(blockTypes, payload.type);
  const seed = blockType?.defaultValue?.();
  if (seed === undefined) {
    return payload;
  }
  if (typeof seed === "object" && seed !== null) {
    return { ...payload, ...seed };
  }
  return { ...payload, value: seed };
}

/* -------------------------------------------------------------------------- */
/* Default slots                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Default overlay chrome: the bundled {@link Overlays} wrapping the published
 * primitives with the `ov-*` classes + the store-wired delete button. Selection
 * is threaded so the selected ring reflects the shell-tracked selection.
 */
function defaultRenderOverlayChrome({
  targets,
  callbacks,
  selectedTargetId,
  selectedContentId,
}: OverlayChromeParts): ReactNode {
  return (
    <Overlays
      targets={targets}
      callbacks={callbacks}
      selectedTargetId={selectedTargetId}
      selectedContentId={selectedContentId}
    />
  );
}

function defaultRenderLayout({
  canvas,
  status,
}: HostShellLayoutParts): ReactNode {
  return (
    <div className="admin-layout">
      <div className="admin-main">
        {status}
        {canvas}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inner canvas (inside FrameLinkProvider + StoreProvider)                    */
/* -------------------------------------------------------------------------- */

interface HostShellCanvasProps {
  iframeOrigin: string;
  iframeSrc: string;
  designWidth: number;
  designHeight: number;
  headerOffset: number;
  blockTypes: BlockTypeRegistry;
  renderStatus: (state: ConnectionState, scale: number) => ReactNode;
  renderLayout: (parts: HostShellLayoutParts) => ReactNode;
  renderOverlayChrome: (parts: OverlayChromeParts) => ReactNode;
  children: ReactNode;
}

/**
 * The store-injection + scaled-iframe canvas. Lives INSIDE `FrameLinkProvider`
 * (so `useSendElements`'s `useSend` has transport) and INSIDE `StoreProvider`
 * (so `useContentStore()` surfaces the injected adapter + snapshot).
 */
function HostShellCanvas({
  iframeOrigin,
  iframeSrc,
  designWidth,
  designHeight,
  headerOffset,
  blockTypes,
  renderStatus,
  renderLayout,
  renderOverlayChrome,
  children,
}: HostShellCanvasProps): ReactNode {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { apply, store } = useContentStore();
  const sendElements = useSendElements();

  // Shell-tracked selection, so the overlay chrome can render a selected ring.
  // Selection is ALSO dispatched through the store as a SelectOp (below) to keep
  // every overlay/panel intent flowing through the single `apply` entry point;
  // this local mirror only drives the visual selected state.
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );

  // Track the previous max index per target so we can blank orphaned trailing
  // slots after a delete/move that shortens a target (the iframe merge never
  // deletes; sending an empty item clears the slot).
  const prevMaxRef = useRef<Map<string, number>>(
    maxIndexByTarget(store.getSnapshot()),
  );

  const inject = useCallback(
    (next: ContentSnapshot): void => {
      for (const payload of next) {
        void sendElements(payload).catch(() => {
          /* not connected yet / peer gone */
        });
      }
      const nextMax = maxIndexByTarget(next);
      for (const [targetId, prevMax] of prevMaxRef.current) {
        const currentMax = nextMax.get(targetId) ?? -1;
        for (let i = currentMax + 1; i <= prevMax; i++) {
          void sendElements(blankPayload(targetId, i)).catch(() => {
            /* ignore */
          });
        }
      }
      prevMaxRef.current = nextMax;
    },
    [sendElements],
  );

  // Apply an op through the store, then re-inject the resulting snapshot.
  const dispatch = useCallback(
    (op: HostContentOp): void => {
      const next = apply(op);
      inject(next);
    },
    [apply, inject],
  );

  const onInsert = useCallback(
    (targetId: string, index: number, payload: InsertOp["payload"]): void => {
      dispatch({
        kind: "insert",
        targetId,
        index,
        payload: applyInsertDefaults(blockTypes, payload),
      });
    },
    [dispatch, blockTypes],
  );

  const onMove = useCallback(
    (from: ContentLocation, to: ContentLocation): void => {
      dispatch({ kind: "move", from, to });
    },
    [dispatch],
  );

  const onSelect = useCallback(
    (targetId: string, contentId?: string): void => {
      setSelectedTargetId(targetId);
      setSelectedContentId(contentId ?? null);
      dispatch(
        contentId !== undefined
          ? { kind: "select", targetId, contentId }
          : { kind: "select", targetId },
      );
    },
    [dispatch],
  );

  const operationCallbacks = useMemo<OperationCallbacks>(
    () => ({ onInsert, onMove, onSelect }),
    [onInsert, onMove, onSelect],
  );

  const { scale, connectionState, targets, callbacks } = useStardustHost(
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

  const overlayChrome = renderOverlayChrome({
    targets,
    callbacks,
    scale,
    selectedTargetId,
    selectedContentId,
  });

  // On (re)connect, push the full snapshot so the iframe reflects admin state.
  const connected = connectionState === "connected";
  useEffect((): void => {
    if (connected) {
      inject(store.getSnapshot());
    }
  }, [connected, inject, store]);

  const scaledHeight = designHeight * scale;

  const canvas = (
    <div className="admin-canvas-scroll">
      <div
        className="admin-canvas"
        style={{ height: scaledHeight }}
        data-connection-state={connectionState}
      >
        <iframe
          ref={iframeRef}
          className="admin-canvas__iframe"
          title="Embedded site preview"
          src={iframeSrc}
          style={{
            width: designWidth,
            height: designHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
        {/* Overlay layer: absolutely positioned over the scaled canvas,
            sharing its top-left origin. mapGeometry has already applied
            `scale`, so no further transform is needed here. */}
        <div className="admin-overlay-layer">
          {overlayChrome}
          {children}
        </div>
      </div>
    </div>
  );

  const status = renderStatus(connectionState, scale);

  return <>{renderLayout({ canvas, status, children })}</>;
}

/* -------------------------------------------------------------------------- */
/* HostShell                                                                  */
/* -------------------------------------------------------------------------- */

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
    blockTypes = EMPTY_BLOCK_TYPES,
    renderStatus,
    renderLayout = defaultRenderLayout,
    renderOverlayChrome = defaultRenderOverlayChrome,
    children,
  } = props;

  const resolvedSrc = iframeSrc ?? `${iframeOrigin}/`;

  // `FrameLinkProvider` recreates (and destroys) its frame-link instance
  // whenever the `options` object identity changes, which would tear down the
  // connection on every render. Keep a stable options object, updating it only
  // when the target origin actually changes.
  const optionsRef = useRef<{ targetOrigin: string }>({
    targetOrigin: iframeOrigin,
  });
  if (optionsRef.current.targetOrigin !== iframeOrigin) {
    optionsRef.current = { targetOrigin: iframeOrigin };
  }

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
    <FrameLinkProvider options={optionsRef.current}>
      <StoreProvider store={store}>
        <div className="admin-root">
          <HostShellCanvas
            iframeOrigin={iframeOrigin}
            iframeSrc={resolvedSrc}
            designWidth={designWidth}
            designHeight={designHeight}
            headerOffset={headerOffset}
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
