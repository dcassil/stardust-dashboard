/**
 * `editing` layer barrel — the public entry of the editing behavior layer
 * (DASH-T-0001). Cross-layer consumers import editing ONLY through this entry;
 * the module-boundary rules in `eslint.config.mjs` / `.dependency-cruiser.cjs`
 * forbid reaching into individual files.
 *
 * FROZEN PUBLIC SURFACE: the identifiers below are re-exported from the package
 * root (`src/index.ts`) and are the contract downstream tasks/initiatives design
 * against. See `editingTypes.ts` for the frozen shapes.
 */

export { EditingProvider } from "./EditingProvider.js";
export type { EditingProviderProps } from "./EditingProvider.js";

export {
  useSelection,
  useEditingState,
  useEditingActions,
} from "./hooks.js";

export type {
  EditingRef,
  SelectionState,
  EditingState,
  EditingActions,
  EditingCallbacks,
} from "./editingTypes.js";
