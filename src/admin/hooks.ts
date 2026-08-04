/**
 * The focused admin UI-state read-hooks (DASH-T-0001 skeleton).
 *
 * One hook per context slice (NFR-005 narrow subscription). Each throws when
 * used outside an {@link AdminProvider} — failing loudly — mirroring the editing
 * hooks and `useContentStore`.
 *
 * NAMES ARE FROZEN: `useSidebarState`, `useModalState`, `useOverlayState`,
 * `useLayoutState` leave the package root unchanged.
 */

import { useContext } from "react";
import {
  LayoutContext,
  ModalContext,
  OverlayContext,
  SidebarContext,
} from "./adminContext.js";
import type {
  LayoutState,
  ModalState,
  OverlayState,
  SidebarState,
} from "./adminTypes.js";

/** Read sidebar visibility/size state. Re-renders only on sidebar changes. */
export function useSidebarState(): SidebarState {
  const value = useContext(SidebarContext);
  if (value === null) {
    throw new Error("useSidebarState must be used within an <AdminProvider>.");
  }
  return value;
}

/** Read modal-host state. Re-renders only on modal changes. */
export function useModalState(): ModalState {
  const value = useContext(ModalContext);
  if (value === null) {
    throw new Error("useModalState must be used within an <AdminProvider>.");
  }
  return value;
}

/**
 * Read overlay state — including the `edit | preview` {@link OverlayState.mode}
 * that the shipped dog-ear preview toggle re-sources from (frozen decision #2).
 * Re-renders only on overlay changes.
 */
export function useOverlayState(): OverlayState {
  const value = useContext(OverlayContext);
  if (value === null) {
    throw new Error("useOverlayState must be used within an <AdminProvider>.");
  }
  return value;
}

/** Read layout/region state. Re-renders only on layout changes. */
export function useLayoutState(): LayoutState {
  const value = useContext(LayoutContext);
  if (value === null) {
    throw new Error("useLayoutState must be used within an <AdminProvider>.");
  }
  return value;
}
