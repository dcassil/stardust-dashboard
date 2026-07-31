/**
 * The shell-tracked selection context + {@link useHostSelection} hook
 * (SIFR-T-0033 / SIFR-T-0035). Extracted from `HostShell.tsx` so the component
 * modules stay under the size limit; re-exported through `shell/index.ts` so the
 * public API is unchanged.
 */

import { createContext, useContext } from "react";
import type { HostSelection } from "./hostShellTypes.js";

export const HostSelectionContext = createContext<HostSelection>({
  selectedTargetId: null,
  selectedContentId: null,
});

/**
 * Read the shell-tracked selection from anywhere inside a {@link HostShell} tree
 * (overlay children, a side panel, etc.). Returns `{ selectedTargetId,
 * selectedContentId }`, both `null` when nothing is selected. This is the clean,
 * warning-free way for a consumer side panel to follow selection — no render-phase
 * `setState` mirroring required. Outside a `HostShell`, returns the empty
 * selection default. Additive/backward-compatible.
 */
export function useHostSelection(): HostSelection {
  return useContext(HostSelectionContext);
}
