/**
 * FROZEN STRUCTURE-LAYER CONTRACT — the layout type + constant substrate
 * (DASH-T-0013). Every region primitive (DASH-T-0014…0018), the turnkey
 * `AdminShell` (DASH-T-0019), the `HostShell` re-wrap (DASH-T-0020), and the
 * DASH-I-0004 theme design against these names/shapes. Pure module: zero runtime
 * beyond the `as const` class-name constants (tree-shakeable).
 *
 * BOUNDARY (per DASH-T-0013 AC): imports ONLY React + the `admin`/`editing`
 * public barrels (for slot-contract types) — never a concrete store or geometry.
 */

import type { CSSProperties, ReactNode } from "react";
import type { Command, ToolContribution } from "../admin";

/** Base props every region primitive accepts. */
export interface RegionProps {
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly children?: ReactNode;
}

/** The layout region set — keys of `useLayoutState().visibleRegions`. */
export type LayoutRegionName =
  | "topbar"
  | "sidebar"
  | "main-content"
  | "side-panel"
  | "modal-host"
  | "overlay-layer"
  | "iframe-area"
  | "footer"
  | "command-region";

/* -------------------------------------------------------------------------- */
/* Slot contracts — typed objects passed to slot renderers (never DOM/props).  */
/* -------------------------------------------------------------------------- */

/** `empty` slot: why the content area is empty (e.g. `"no-selection"`, `"no-content"`). */
export interface EmptySlotContract {
  readonly reason: string;
}

/** `loading` slot: optional message while the connection is not ready. */
export interface LoadingSlotContract {
  readonly message?: string;
}

/** `modal-content` slot: the modal id + payload + a close handle. */
export interface ModalContentContract {
  readonly id: string;
  readonly payload?: unknown;
  readonly close: () => void;
}

/**
 * `account` slot: the DASH-I-0001 reserved `currentUser` seam shape — typed but
 * stub this round (no current-user controller exists yet). Reserved so a future
 * `useCurrentUser` fills it additively.
 */
export interface AccountContract {
  readonly currentUser?: unknown;
}

/** `action-area` slot: the command/extension handles a top-bar toolbar renders. */
export interface ActionAreaContract {
  readonly commands: readonly Command[];
  readonly tools: readonly ToolContribution[];
}

/** `topbar` slot: the whole top bar region contract. */
export interface TopbarContract {
  readonly account: AccountContract;
  readonly actionArea: ActionAreaContract;
}

/** `sidebar` slot: active-tab state the sidebar content may reflect. */
export interface SidebarContract {
  readonly activeTab: string | null;
  readonly setActiveTab: (tab: string | null) => void;
}

/** `page-header` slot: rendered above the canvas in main content. */
export interface PageHeaderContract {
  readonly selectedTargetId: string | null;
  readonly selectedContentId: string | null;
}

/** `content-wrapper` slot: wraps the canvas region. */
export interface ContentWrapperContract {
  readonly children: ReactNode;
}

/**
 * The nine surgical named slots, each a renderer of its documented contract. A
 * consumer overrides one via `Partial<ShellSlots>` without touching the rest.
 */
export interface ShellSlots {
  readonly topbar: (contract: TopbarContract) => ReactNode;
  readonly sidebar: (contract: SidebarContract) => ReactNode;
  readonly "page-header": (contract: PageHeaderContract) => ReactNode;
  readonly "content-wrapper": (contract: ContentWrapperContract) => ReactNode;
  readonly "modal-content": (contract: ModalContentContract) => ReactNode;
  readonly empty: (contract: EmptySlotContract) => ReactNode;
  readonly loading: (contract: LoadingSlotContract) => ReactNode;
  readonly account: (contract: AccountContract) => ReactNode;
  readonly "action-area": (contract: ActionAreaContract) => ReactNode;
}

/** Props for the turnkey `AdminShell` (behavior arrives via `AdminProvider`). */
export interface AdminShellProps {
  readonly slots?: Partial<ShellSlots>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* sd-* shell/region class-hook constants — the single source DASH-I-0004      */
/* styles against (importing these, not string literals).                      */
/* -------------------------------------------------------------------------- */

export const SD_SHELL_ROOT = "sd-shell-root" as const;
export const SD_TOPBAR = "sd-topbar" as const;
export const SD_SIDEBAR = "sd-sidebar" as const;
export const SD_MAIN_CONTENT = "sd-main-content" as const;
export const SD_SIDE_PANEL = "sd-side-panel" as const;
export const SD_MODAL_HOST = "sd-modal-host" as const;
export const SD_OVERLAY_LAYER = "sd-overlay-layer" as const;
export const SD_IFRAME_AREA = "sd-iframe-area" as const;
export const SD_FOOTER = "sd-footer" as const;
export const SD_COMMAND_REGION = "sd-command-region" as const;
