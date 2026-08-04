/**
 * `admin` layer barrel — the public entry of the admin behavior layer
 * (DASH-T-0001). Cross-layer consumers import admin ONLY through this entry.
 *
 * FROZEN PUBLIC SURFACE: re-exported from `src/index.ts`; the contract
 * downstream tasks/initiatives design against. See `adminTypes.ts` for shapes.
 */

export { AdminProvider } from "./AdminProvider.js";

export {
  useSidebarState,
  useModalState,
  useOverlayState,
  useLayoutState,
} from "./hooks.js";

export type {
  AdminProviderProps,
  OverlayMode,
  OverlayState,
  SidebarState,
  ModalState,
  ModalEntry,
  LayoutState,
  Breakpoint,
} from "./adminTypes.js";
