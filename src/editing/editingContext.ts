/**
 * The three editing React contexts + their read hooks-substrate (DASH-T-0001).
 *
 * CONTEXT-GRANULARITY DECISION (frozen): editing state is served by THREE
 * SEPARATE contexts — selection, session-state, and actions — NOT one context
 * with memoized selector slices. Rationale (NFR-005): a React context consumer
 * re-renders whenever the context VALUE identity changes, regardless of which
 * slice it reads; memoizing slices inside a single value does not prevent that
 * without an extra selector dependency (e.g. `use-context-selector`). Splitting
 * into one context per concern gives narrow subscription with standard React
 * semantics and zero extra deps: a selection-only consumer re-renders only when
 * selection changes, and — because the actions context value is referentially
 * stable — an actions-only consumer never re-renders at all.
 *
 * Contexts live in their own module (the `HostSelectionContext.ts` idiom) so
 * `EditingProvider.tsx` (writer) and `hooks.ts` (readers) share them without an
 * import cycle.
 */

import { createContext } from "react";
import type {
  EditingActions,
  EditingState,
  SelectionState,
} from "./editingTypes.js";

/**
 * Selection slice. `null` sentinel = "read outside an `EditingProvider`", which
 * the read hook turns into a loud error rather than a silent empty selection.
 */
export const SelectionContext = createContext<SelectionState | null>(null);

/** Editing-session slice. `null` sentinel = read outside a provider. */
export const EditingStateContext = createContext<EditingState | null>(null);

/**
 * Actions slice. Its value is referentially STABLE for a given provider mount,
 * so consumers reading only actions never re-render. `null` sentinel = read
 * outside a provider.
 */
export const EditingActionsContext = createContext<EditingActions | null>(null);
