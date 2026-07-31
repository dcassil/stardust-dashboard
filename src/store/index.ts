/**
 * `@stardust-cms/dashboard` store-seam barrel — the public entry of the `store`
 * layer. Cross-layer consumers (shell, overlays, blocks) import the store seam
 * ONLY through this entry; the module-boundary rules in `eslint.config.mjs`
 * forbid reaching into `store/adapter.ts` / `store/StoreProvider.tsx` directly.
 *
 * INVARIANT (NFR-001): this layer imports ONLY the published host + protocol
 * types. It never names a concrete store or `versioned-content-engine`.
 */

export type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
  HostContentOpKind,
  DeleteOp,
  EditOp,
} from "./adapter.js";
export { dispatchStoreOp } from "./adapter.js";

export {
  StoreProvider,
  useContentStore,
} from "./StoreProvider.js";
export type {
  StoreProviderProps,
  ContentStoreContextValue,
} from "./StoreProvider.js";
