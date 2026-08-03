/**
 * `StoreProvider` + `useContentStore` — the store-agnostic React binding.
 *
 * This is the reusable replacement for the SIFR demo's
 * `Editing` / `StoreBridge` / `useContentStore` trio. Those files hard-coded a
 * concrete `@demo/shared/store` (`createDemoContentStore`) and imported its
 * `StoreOperation` / `ContentSnapshot` types directly. Here the store arrives by
 * **injection** as a {@link ContentStoreAdapter}, so the shell never names a
 * concrete store — satisfying NFR-001 (dependency-cruiser forbids any store
 * import under `src/**`).
 *
 * Responsibilities (a strict subset of the demo's `useContentStore`, minus the
 * transport/injection wiring, which the shell/T-d owns):
 *  - hold the injected adapter and the current {@link ContentSnapshot} in state;
 *  - expose `apply(op)` that calls `adapter.apply(op)`, stores the returned
 *    snapshot, and hands it back so the caller can re-inject it;
 *  - re-seed the snapshot if a different adapter instance is injected.
 *
 * The provider owns NO transport: `cms/sendElements` re-injection stays in the
 * shell (SIFR-T-0033), which subscribes to the snapshot this hook surfaces. That
 * keeps this module free of `frame-link` and any store, so the seam is portable.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "./adapter.js";

/** The value exposed by {@link useContentStore}. */
export interface ContentStoreContextValue {
  /** The injected adapter, for callers that need its optional capabilities. */
  readonly store: ContentStoreAdapter;
  /** The current snapshot, kept in React state so consumers re-render. */
  readonly snapshot: ContentSnapshot;
  /**
   * Apply an op through the adapter, surface the new snapshot, and return it so
   * the caller (the shell) can re-inject it into the iframe.
   */
  apply: (op: HostContentOp) => ContentSnapshot;
}

const ContentStoreContext = createContext<ContentStoreContextValue | null>(null);

export interface StoreProviderProps {
  /** The injected content store. The ONLY place a concrete store enters. */
  store: ContentStoreAdapter;
  children: ReactNode;
}

/**
 * Supplies an injected {@link ContentStoreAdapter} to the editing tree and holds
 * the live snapshot. Read it with {@link useContentStore}.
 */
export function StoreProvider({
  store,
  children,
}: StoreProviderProps): ReactNode {
  // Seed from the adapter's current snapshot. If a *different* adapter instance
  // is injected later, re-seed from it (the previous adapter's state is stale).
  const [snapshot, setSnapshot] = useState<ContentSnapshot>(() =>
    store.getSnapshot(),
  );
  // Track the previously-seen adapter in state (not a ref) so the "adopt a newly
  // injected store" adjustment happens without reading a ref during render — the
  // React-recommended "storing information from previous renders" pattern.
  const [prevStore, setPrevStore] = useState<ContentStoreAdapter>(store);
  if (prevStore !== store) {
    setPrevStore(store);
    // A new store was injected; adopt its snapshot on this render.
    setSnapshot(store.getSnapshot());
  }

  // If the injected store implements the optional `subscribe` capability,
  // register a listener that re-reads `getSnapshot()` on every notification.
  // This closes the gap for operations consumers call DIRECTLY on the store
  // (e.g. `publish()`, `setViewVersion()`) which never pass through the `apply`
  // wrapper below — the store notifies, we adopt the fresh snapshot, and the
  // shell re-injects. The store is neither wrapped nor mutated; we only call
  // its own `subscribe`/`getSnapshot`. A store WITHOUT `subscribe` skips this
  // entirely and behaves exactly as before (the `apply` wrapper still works).
  useEffect((): (() => void) | undefined => {
    if (store.subscribe === undefined) {
      return undefined;
    }
    // Keep state in sync on each notification. On notification we re-read the
    // fresh snapshot via `getSnapshot()`; this setState runs from the store's
    // callback (not synchronously in the effect body), so it does not cause
    // cascading render churn. The initial snapshot is already seeded by the
    // `useState` initializer during render, and this effect runs synchronously
    // after commit — before any store operation the consumer could trigger —
    // so no mount-time catch-up read is needed. `subscribe` is invoked as a
    // method ON `store` (not destructured), preserving the store's `this`
    // without wrapping or mutating it.
    return store.subscribe(() => {
      setSnapshot(store.getSnapshot());
    });
  }, [store]);

  const apply = useCallback(
    (op: HostContentOp): ContentSnapshot => {
      const next = store.apply(op);
      setSnapshot(next);
      return next;
    },
    [store],
  );

  const value = useMemo<ContentStoreContextValue>(
    () => ({ store, snapshot, apply }),
    [store, snapshot, apply],
  );

  return (
    <ContentStoreContext.Provider value={value}>
      {children}
    </ContentStoreContext.Provider>
  );
}

/**
 * Read the injected store binding. Must be called inside a {@link StoreProvider};
 * throws otherwise so a missing provider fails loudly rather than silently
 * dropping edits.
 */
export function useContentStore(): ContentStoreContextValue {
  const value = useContext(ContentStoreContext);
  if (value === null) {
    throw new Error(
      "useContentStore must be used within a <StoreProvider>. " +
        "Wrap the editing tree in <StoreProvider store={adapter}> and inject a ContentStoreAdapter.",
    );
  }
  return value;
}
