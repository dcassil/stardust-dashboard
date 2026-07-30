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
  type ReactNode,
} from "react";
import { FrameLinkProvider } from "frame-link-react";
import { useStardustHost } from "@stardust-cms/iframe-adapter/host";
import type {
  ConnectionState,
  ContentLocation,
  InsertOp,
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

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

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
   * The overlay / palette / side-panel layer, rendered over the scaled canvas.
   * Later tasks supply block-type-driven palette/side-panel here.
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

/** Default value for a newly inserted block, by type (mirrors the demo). */
function defaultValueFor(type: string): string | undefined {
  switch (type) {
    case "text":
    case "number":
      return "New text block";
    case "image":
      return "https://placehold.co/240x120/6366f1/fff?text=New";
    default:
      return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/* Default slots                                                              */
/* -------------------------------------------------------------------------- */

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
  renderStatus: (state: ConnectionState, scale: number) => ReactNode;
  renderLayout: (parts: HostShellLayoutParts) => ReactNode;
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
  renderStatus,
  renderLayout,
  children,
}: HostShellCanvasProps): ReactNode {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { apply, store } = useContentStore();
  const sendElements = useSendElements();

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
      const value = defaultValueFor(payload.type);
      dispatch({
        kind: "insert",
        targetId,
        index,
        payload: { ...payload, ...(value !== undefined ? { value } : {}) },
      });
    },
    [dispatch],
  );

  const onMove = useCallback(
    (from: ContentLocation, to: ContentLocation): void => {
      dispatch({ kind: "move", from, to });
    },
    [dispatch],
  );

  const onSelect = useCallback(
    (targetId: string, contentId?: string): void => {
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

  const { scale, connectionState } = useStardustHost(iframeRef, {
    origin: iframeOrigin,
    headerOffset,
    ...(operationCallbacks.onInsert
      ? { onInsert: operationCallbacks.onInsert }
      : {}),
    ...(operationCallbacks.onMove ? { onMove: operationCallbacks.onMove } : {}),
    ...(operationCallbacks.onSelect
      ? { onSelect: operationCallbacks.onSelect }
      : {}),
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
        <div className="admin-overlay-layer">{children}</div>
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
    renderStatus,
    renderLayout = defaultRenderLayout,
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
            renderStatus={resolvedRenderStatus}
            renderLayout={renderLayout}
          >
            {children}
          </HostShellCanvas>
        </div>
      </StoreProvider>
    </FrameLinkProvider>
  );
}
