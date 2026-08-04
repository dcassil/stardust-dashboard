/**
 * The four admin UI-state React contexts (DASH-T-0001).
 *
 * Consistent with the editing-layer granularity decision (see
 * `editing/editingContext.ts`): each UI-state concern gets its OWN context so a
 * consumer of one (e.g. `useOverlayState`) does not re-render when an unrelated
 * concern (e.g. the sidebar) changes — NFR-005 narrow subscription. `null`
 * sentinels turn "read outside `AdminProvider`" into a loud error.
 *
 * Contexts live in their own module so the provider (writer) and hooks (readers)
 * share them without an import cycle.
 */

import { createContext } from "react";
import type {
  LayoutState,
  ModalState,
  OverlayState,
  SidebarState,
} from "./adminTypes.js";

/** Sidebar slice. `null` = read outside an `AdminProvider`. */
export const SidebarContext = createContext<SidebarState | null>(null);

/** Modal-host slice. `null` = read outside an `AdminProvider`. */
export const ModalContext = createContext<ModalState | null>(null);

/** Overlay slice (owns the `edit | preview` mode). `null` = outside provider. */
export const OverlayContext = createContext<OverlayState | null>(null);

/** Layout/region slice. `null` = read outside an `AdminProvider`. */
export const LayoutContext = createContext<LayoutState | null>(null);
