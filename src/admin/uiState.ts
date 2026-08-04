/**
 * Admin UI-state controllers (DASH-T-0001 skeleton).
 *
 * One focused hook per slice builds a state object whose ACTION methods are
 * referentially stable (so action-only reads never re-render) and whose STATE
 * changes narrowly (NFR-005). `useUiStateRuntime` combines them for
 * `AdminProvider`. Shapes track REQ-010 exactly; DASH-T-0007 refines behavior
 * (persistence, responsive breakpoint detection, preview-mode transitions)
 * WITHOUT renaming any exported identifier.
 *
 * @internal skeleton — minimal-but-real behavior; not the final controller.
 */

import { useCallback, useMemo, useState } from "react";
import type {
  Breakpoint,
  LayoutState,
  ModalEntry,
  ModalState,
  OverlayMode,
  OverlayState,
  SidebarState,
} from "./adminTypes.js";

function useSidebarStateValue(): SidebarState {
  const [open, setOpenState] = useState(true);
  const [collapsed, setCollapsedState] = useState(false);
  const [activeTab, setActiveTabState] = useState<string | null>(null);
  const setOpen = useCallback((v: boolean): void => { setOpenState(v); }, []);
  const toggle = useCallback((): void => { setOpenState((v) => !v); }, []);
  const collapse = useCallback((v: boolean): void => { setCollapsedState(v); }, []);
  const setActiveTab = useCallback((t: string | null): void => {
    setActiveTabState(t);
  }, []);
  return useMemo<SidebarState>(
    () => ({ open, collapsed, activeTab, setOpen, toggle, collapse, setActiveTab }),
    [open, collapsed, activeTab, setOpen, toggle, collapse, setActiveTab],
  );
}

function useModalStateValue(): ModalState {
  const [stack, setStack] = useState<readonly ModalEntry[]>([]);
  const open = useCallback((id: string, payload?: unknown): void => {
    setStack((prev) => [...prev, { id, payload }]);
  }, []);
  const close = useCallback((id?: string): void => {
    setStack((prev) =>
      id === undefined
        ? prev.slice(0, -1)
        : prev.filter((entry) => entry.id !== id),
    );
  }, []);
  const isOpen = useCallback(
    (id: string): boolean => stack.some((entry) => entry.id === id),
    [stack],
  );
  return useMemo<ModalState>(
    () => ({ stack, open, close, isOpen }),
    [stack, open, close, isOpen],
  );
}

function useOverlayStateValue(): OverlayState {
  const [mode, setModeState] = useState<OverlayMode>("edit");
  const [activeLayer, setActiveLayerState] = useState<string | null>(null);
  const setMode = useCallback((next: OverlayMode): void => { setModeState(next); }, []);
  const setActiveLayer = useCallback((next: string | null): void => {
    setActiveLayerState(next);
  }, []);
  return useMemo<OverlayState>(
    () => ({ mode, activeLayer, setMode, setActiveLayer }),
    [mode, activeLayer, setMode, setActiveLayer],
  );
}

function useLayoutStateValue(): LayoutState {
  const [visibleRegions, setVisibleRegions] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [breakpoint] = useState<Breakpoint>("desktop");
  const setRegionVisible = useCallback((region: string, visible: boolean): void => {
    setVisibleRegions((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.add(region);
      } else {
        next.delete(region);
      }
      return next;
    });
  }, []);
  return useMemo<LayoutState>(
    () => ({ visibleRegions, breakpoint, setRegionVisible }),
    [visibleRegions, breakpoint, setRegionVisible],
  );
}

/** The four UI-state slices `AdminProvider` fans out to the admin contexts. */
export interface UiStateRuntime {
  sidebar: SidebarState;
  modal: ModalState;
  overlay: OverlayState;
  layout: LayoutState;
}

export function useUiStateRuntime(): UiStateRuntime {
  const sidebar = useSidebarStateValue();
  const modal = useModalStateValue();
  const overlay = useOverlayStateValue();
  const layout = useLayoutStateValue();
  return { sidebar, modal, overlay, layout };
}
