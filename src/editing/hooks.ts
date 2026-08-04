/**
 * The focused editing read-hooks (DASH-T-0001 skeleton).
 *
 * One hook per context slice, so a consumer subscribes to exactly the state it
 * needs (NFR-005). Each throws when used outside an {@link EditingProvider} —
 * failing loudly rather than returning a misleading empty value — mirroring the
 * `useContentStore` convention in `src/store`.
 *
 * NAMES ARE FROZEN: `useSelection`, `useEditingState`, `useEditingActions` leave
 * the package root unchanged; downstream tasks/initiatives design against them.
 */

import { useContext } from "react";
import {
  EditingActionsContext,
  EditingStateContext,
  SelectionContext,
} from "./editingContext.js";
import type {
  EditingActions,
  EditingState,
  SelectionState,
} from "./editingTypes.js";

/**
 * Read the current {@link SelectionState}. Re-renders only when selection
 * changes — not when the editing session or draft change.
 *
 * @internal skeleton — returns the provider's stub selection; real selection
 * tracking is DASH-T-0003 / DASH-T-0010. The NAME and return SHAPE are frozen.
 */
export function useSelection(): SelectionState {
  const value = useContext(SelectionContext);
  if (value === null) {
    throw new Error(
      "useSelection must be used within an <EditingProvider> (or <AdminProvider>).",
    );
  }
  return value;
}

/**
 * Read the current {@link EditingState} (session status, ref, draft).
 *
 * @internal skeleton — returns the provider's stub idle state; the real session
 * state machine is DASH-T-0003. The NAME and return SHAPE are frozen.
 */
export function useEditingState(): EditingState {
  const value = useContext(EditingStateContext);
  if (value === null) {
    throw new Error(
      "useEditingState must be used within an <EditingProvider> (or <AdminProvider>).",
    );
  }
  return value;
}

/**
 * Read the stable {@link EditingActions}. The returned object identity is stable
 * for the provider's lifetime, so an actions-only consumer never re-renders.
 *
 * @internal skeleton — `select` routes a real `select` op through the store to
 * prove the single-entry path; the remaining actions are typed no-ops
 * implemented in DASH-T-0003. The NAME and return SHAPE are frozen.
 */
export function useEditingActions(): EditingActions {
  const value = useContext(EditingActionsContext);
  if (value === null) {
    throw new Error(
      "useEditingActions must be used within an <EditingProvider> (or <AdminProvider>).",
    );
  }
  return value;
}
