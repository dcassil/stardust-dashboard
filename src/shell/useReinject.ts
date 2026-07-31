/**
 * The re-injection effects for {@link HostShellCanvas}. Extracted from
 * `HostShell.tsx` so the canvas module stays under the size limit. Not public.
 *
 * Two effects, both driving the iframe from store state:
 *
 *  1. On (re)connect, push the full snapshot so the iframe reflects admin state.
 *  2. Re-inject on EVERY snapshot change — the single re-inject point for all
 *     mutations. Any op that flows through the store (`apply`) updates `snapshot`:
 *     insert/move/select via the op wiring, AND delete/edit that call `apply`
 *     directly (overlay delete button, consumer side panels). The first snapshot
 *     (initial mount / adopting a newly injected store) is skipped here: the
 *     connect effect already pushes the full snapshot once connected, so injecting
 *     it again would be a redundant double-inject. Subsequent changes have no such
 *     coverage, so they inject here. Guarded by `snapshot` reference identity —
 *     `apply` returns a fresh array on every op, so genuine mutations always
 *     re-fire, and no op means no re-inject (no loop: `inject` only sends via the
 *     transport, it never calls `apply` or updates React state).
 */

import { useEffect, useRef } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";

export function useReinject(
  connected: boolean,
  snapshot: ContentSnapshot,
  store: ContentStoreAdapter,
  inject: (next: ContentSnapshot) => void,
): void {
  useEffect((): void => {
    if (connected) {
      inject(store.getSnapshot());
    }
  }, [connected, inject, store]);

  const lastInjectedSnapshotRef = useRef<ContentSnapshot | null>(null);
  useEffect((): void => {
    if (lastInjectedSnapshotRef.current === null) {
      // Initial snapshot — the connect effect owns the first full inject.
      lastInjectedSnapshotRef.current = snapshot;
      return;
    }
    if (lastInjectedSnapshotRef.current === snapshot) {
      return;
    }
    lastInjectedSnapshotRef.current = snapshot;
    inject(snapshot);
  }, [snapshot, inject]);
}
