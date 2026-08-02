/**
 * Public config defaults and prop/slot types for {@link HostShell}
 * (SIFR-T-0033). Extracted from `HostShell.tsx` so the component modules stay
 * under the size limit; the `shell/index.ts` barrel re-exports every symbol here,
 * keeping the package's public API byte-for-byte unchanged.
 */

import type { ReactNode } from "react";
import type {
  ConnectionState,
  HostPointer,
  MappedTarget,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import type { ContentStoreAdapter } from "../store";
import type { BlockTypeRegistry } from "../blocks";

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
export const EMPTY_BLOCK_TYPES: BlockTypeRegistry = [];

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
  /**
   * The local user's latest pointer position over the iframe, forwarded verbatim
   * from `useStardustHost().pointer` (SIFR-I-0007), or `null` when the pointer is
   * not over the iframe. Lets a custom `renderOverlayChrome` draw the local
   * user's collaboration cursor over the scaled canvas.
   *
   * COORDINATE CONTRACT: `x`/`y` are NORMALIZED `0..1` of the iframe's
   * design/viewport space — transform-neutral (NOT premultiplied by `scale` or
   * scroll). The dashboard forwards these SAME normalized values; the consumer
   * (e.g. the demo) multiplies them by its own stage/canvas box to place the
   * cursor. `null` unless the embedded iframe opts in to pointer streaming
   * (`StardustAdapterProvider publishPointer`).
   */
  pointer: HostPointer;
  /** The shell-tracked selected target id (drives the target selected ring). */
  selectedTargetId: string | null;
  /** The shell-tracked selected content id (drives the item selected ring). */
  selectedContentId: string | null;
  /**
   * Whether editing chrome is active. Forwarded from {@link HostShellProps.editable}
   * so a custom `renderOverlayChrome` can strip its own editing affordances for a
   * read-only view. The bundled {@link Overlays} default consumes it as its
   * `editable` prop. `true` unless `HostShell editable={false}`.
   */
  editable: boolean;
}

/** The composed regions handed to a custom {@link HostShellProps.renderLayout}. */
export interface HostShellLayoutParts {
  /** The scaled iframe canvas with the overlay layer (`children`) mounted over it. */
  canvas: ReactNode;
  /** The connection-status region (the resolved `renderStatus` output). */
  status: ReactNode;
  /** The overlay/palette/side-panel layer passed to `HostShell` as `children`. */
  children: ReactNode;
  /**
   * The shell-tracked selected target id, exposed so a consumer's `renderLayout`
   * (e.g. a side panel) can reflect the current selection WITHOUT mirroring it
   * via a render-phase `setState` — which triggers React's "Cannot update a
   * component while rendering a different component" warning and desyncs the
   * sidebar. `null` when nothing is selected. Also available via
   * {@link useHostSelection}.
   */
  selectedTargetId: string | null;
  /**
   * The shell-tracked selected content id (see {@link selectedTargetId}). `null`
   * when a target — but no specific item — is selected, or nothing is selected.
   */
  selectedContentId: string | null;
}

/** The value surfaced by {@link useHostSelection}. */
export interface HostSelection {
  /** The shell-tracked selected target id, or `null`. */
  selectedTargetId: string | null;
  /** The shell-tracked selected content id, or `null`. */
  selectedContentId: string | null;
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
   * Whether the editor is interactive. Default `true`. Set `false` when the
   * consumer is viewing a published/historical read-only version: the overlay
   * editing affordances (selection ring interaction, delete button, drag-and-drop
   * insertion) are disabled and the bundled block {@link Palette} renders a
   * disabled, non-draggable state. Read-only VIEWING (geometry boxes, presence)
   * is unaffected. Forwarded to the overlay chrome via
   * {@link OverlayChromeParts.editable} and to any bundled palette rendered as
   * `children`.
   * @default true
   */
  editable?: boolean;
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
