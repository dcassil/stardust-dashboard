/**
 * `AdminProvider` — the composable admin behavior root (DASH-T-0001).
 *
 * The single turnkey provider a host mounts to get the whole admin behavior
 * surface. It composes `EditingProvider` (which itself composes `StoreProvider`
 * from the injected `store`), publishes the four admin UI-state contexts
 * (sidebar / modal / overlay / layout), and mounts the command + extension
 * registries (`RegistryProvider`). Progressive adoption: a host that wants only
 * editing can mount `EditingProvider` directly instead.
 *
 * The HostShell refactor onto this provider is DASH-T-0010.
 */

import type { ReactNode } from "react";
import { EditingProvider } from "../editing";
import {
  LayoutContext,
  ModalContext,
  OverlayContext,
  SidebarContext,
} from "./adminContext.js";
import type { AdminProviderProps } from "./adminTypes.js";
import { RegistryProvider } from "./RegistryProvider.js";
import { useUiStateRuntime } from "./uiState.js";

/** Fans the UI-state runtime out to the four admin contexts. */
function UiStateProvider({ children }: { children: ReactNode }): ReactNode {
  const { sidebar, modal, overlay, layout } = useUiStateRuntime();
  return (
    <SidebarContext.Provider value={sidebar}>
      <ModalContext.Provider value={modal}>
        <OverlayContext.Provider value={overlay}>
          <LayoutContext.Provider value={layout}>
            {children}
          </LayoutContext.Provider>
        </OverlayContext.Provider>
      </ModalContext.Provider>
    </SidebarContext.Provider>
  );
}

export function AdminProvider({
  store,
  children,
  ...callbacks
}: AdminProviderProps): ReactNode {
  return (
    <EditingProvider store={store} {...callbacks}>
      <UiStateProvider>
        <RegistryProvider>{children}</RegistryProvider>
      </UiStateProvider>
    </EditingProvider>
  );
}
