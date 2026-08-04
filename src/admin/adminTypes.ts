/**
 * FROZEN PUBLIC CONTRACT — the admin UI-state type surface (DASH-T-0001 spike).
 *
 * These shapes back `useSidebarState`, `useModalState`, `useOverlayState`,
 * `useLayoutState` and the `AdminProvider` root, tracking the initiative's
 * REQ-009/REQ-010 exactly. Names are locked and copied into DASH-I-0001's
 * Detailed Design. Bodies are minimal skeleton shapes; DASH-T-0007 (shared
 * UI-state controller) implements real behavior WITHOUT renaming any exported
 * identifier. The command/extension registries (REQ-011/012) are a separate
 * task (DASH-T-0008) and are intentionally NOT part of this spike.
 *
 * BOUNDARY (per DASH-T-0001 AC): this module imports ONLY React, the `store`
 * seam, and the `editing` layer — never a concrete store, never geometry.
 */

import type { ReactNode } from "react";
import type { ContentStoreAdapter } from "../store";
import type { EditingCallbacks } from "../editing";

/**
 * The overlay display mode (REQ-010). `"edit"` and `"preview"` are the built-in
 * modes; the union is intentionally OPEN (`string & Record<never, never>`) so a
 * consumer can add custom modes without a contract change. `useOverlayState`
 * OWNS this mode: the shipped dog-ear preview toggle re-sources from it
 * (frozen decision #2 / REQ-010 — moved out of local canvas state).
 */
export type OverlayMode = "edit" | "preview" | (string & Record<never, never>);

/** Coarse responsive breakpoint the structure layer maps to collapse (REQ-010). */
export type Breakpoint = "mobile" | "tablet" | "desktop";

/** One entry on the modal stack: a modal id plus an optional opaque payload. */
export interface ModalEntry {
  readonly id: string;
  readonly payload?: unknown;
}

/**
 * Sidebar state, served by {@link useSidebarState} (REQ-010). State + setters
 * only; focus-trap/responsive-collapse live in the DASH-I-0005 primitives.
 */
export interface SidebarState {
  /** Whether the sidebar is shown. */
  readonly open: boolean;
  /** Whether the sidebar is collapsed to a rail. */
  readonly collapsed: boolean;
  /** The active sidebar tab id, or `null`. */
  readonly activeTab: string | null;
  /** Show/hide the sidebar. */
  setOpen(open: boolean): void;
  /** Toggle shown/hidden. */
  toggle(): void;
  /** Collapse/expand the sidebar rail. */
  collapse(collapsed: boolean): void;
  /** Set the active sidebar tab. */
  setActiveTab(tab: string | null): void;
}

/**
 * Modal-host state, served by {@link useModalState} (REQ-010). A STACK: `open`
 * pushes, `close` pops the given id (or the top when omitted).
 */
export interface ModalState {
  /** The open modals, bottom-to-top. */
  readonly stack: readonly ModalEntry[];
  /** Push a modal (optionally with a payload). */
  open(id: string, payload?: unknown): void;
  /** Pop the modal with `id`, or the top modal when `id` is omitted. */
  close(id?: string): void;
  /** Whether the modal with `id` is open. */
  isOpen(id: string): boolean;
}

/**
 * Overlay state, served by {@link useOverlayState} (REQ-010). Owns the
 * `edit | preview` {@link OverlayMode} plus the active overlay layer.
 */
export interface OverlayState {
  /** The current overlay mode; `"edit"` by default. */
  readonly mode: OverlayMode;
  /** The active overlay layer id, or `null`. */
  readonly activeLayer: string | null;
  /** Set the overlay mode (e.g. enter/leave preview). */
  setMode(mode: OverlayMode): void;
  /** Set the active overlay layer. */
  setActiveLayer(layer: string | null): void;
}

/**
 * Layout/region state, served by {@link useLayoutState} (REQ-010). `visibleRegions`
 * is a set keyed by region name; `breakpoint` is a coarse token the structure
 * layer maps to responsive collapse.
 */
export interface LayoutState {
  /** The set of currently-visible region names. */
  readonly visibleRegions: ReadonlySet<string>;
  /** The current coarse breakpoint. */
  readonly breakpoint: Breakpoint;
  /** Show/hide a named region. */
  setRegionVisible(region: string, visible: boolean): void;
}

/* -------------------------------------------------------------------------- */
/* Command + extension registry types (REQ-011/012)                           */
/* The registries themselves are DASH-T-0008; these are the pure-type contract */
/* they and the DASH-I-0005 auto-render seam consume.                          */
/* -------------------------------------------------------------------------- */

/**
 * A registrable command (REQ-011). `run` performs it; `when` gates visibility
 * against an opaque context; `keybinding` is an optional accelerator. `ctx` is
 * `unknown` this round — a future `permissions` seam narrows it (Designed-for-
 * later seams) without changing this shape.
 */
export interface Command {
  readonly id: string;
  readonly title: string;
  run(ctx?: unknown): void;
  when?(ctx?: unknown): boolean;
  readonly keybinding?: string;
}

/**
 * A registrable action (REQ-012) — a command-like unit without title/keybinding
 * chrome, invoked programmatically rather than surfaced in a palette.
 */
export interface Action {
  readonly id: string;
  run(ctx?: unknown): void;
}

/** A panel contribution (REQ-012): an id + a render descriptor. */
export interface PanelContribution {
  readonly id: string;
  render(): ReactNode;
}

/** A tool contribution (REQ-012): an id + a render descriptor. */
export interface ToolContribution {
  readonly id: string;
  render(): ReactNode;
}

/** The four extension kinds IMPLEMENTED this round (REQ-012). */
export type ExtensionKind = "commands" | "actions" | "panels" | "tools";

/**
 * The four DESIGNED-FOR-LATER kinds — reserved in the type union NOW so adding
 * their implementation later is additive (no breaking change to the
 * registration signature). Registering one is a typed + runtime "not implemented
 * this round" error (the guard is DASH-T-0008).
 */
export type ReservedExtensionKind =
  | "navigation"
  | "permissions"
  | "currentUser"
  | "resources";

/** Every kind the registration API accepts — forward-compatible union. */
export type AnyExtensionKind = ExtensionKind | ReservedExtensionKind;

/**
 * Marks a reserved kind's contribution: no shape is implemented this round, so
 * the branded field makes constructing one visible at compile time (the runtime
 * throw lives in DASH-T-0008).
 */
export interface ReservedContribution {
  readonly __reserved: "not implemented this round";
}

/**
 * The typed contribution for a given extension kind (REQ-012), keyed on `K` so
 * `useRegisterExtension(kind, contribution)` type-checks the contribution
 * against the kind. Reserved kinds resolve to {@link ReservedContribution}.
 */
export type ExtensionContribution<K extends AnyExtensionKind> =
  K extends "commands"
    ? Command
    : K extends "actions"
      ? Action
      : K extends "panels"
        ? PanelContribution
        : K extends "tools"
          ? ToolContribution
          : ReservedContribution;

/**
 * Props for the `AdminProvider` root (REQ-009). The editing lifecycle callbacks
 * are spread as individual props and forwarded to `EditingProvider`.
 */
export interface AdminProviderProps extends EditingCallbacks {
  /** The injected content store. The ONLY place a concrete store enters. */
  store: ContentStoreAdapter;
  children?: ReactNode;
}
