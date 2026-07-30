/**
 * The demo's **presentation adapter** — a thin `ContentStoreAdapter` wrapper the
 * admin app hands to `HostShell` so the draft/live/history controls change what
 * the shell injects WITHOUT modifying the shell (SIFR-T-0036).
 *
 * `HostShell` injects `store.getSnapshot()` on connect and after each op. This
 * wrapper makes `getSnapshot()` return the currently-selected view (draft / live
 * / a historical version) so the app can preview any of them by swapping the
 * wrapper and remounting the shell. It also enforces read-only preview: in
 * `live`/`history` mode content-mutating ops are swallowed (a past version can be
 * inspected but not edited), while `select` ops are always forwarded to the app
 * so the side panel can track selection.
 *
 * This is the store-adapter SWAP seam made concrete — the shell is unchanged
 * whether it is handed the raw VCE adapter or this wrapper (unit-tested here).
 */

import type {
  ContentSnapshot,
  ContentStoreAdapter,
  HostContentOp,
} from "@stardust-cms/dashboard";
import type { VersionedContentStoreAdapter } from "../src/versionedContentStoreAdapter.js";

export type ViewMode = "draft" | "live" | "history";

export interface Selection {
  targetId: string | null;
  contentId: string | null;
}

/**
 * Build a presentation adapter over a {@link VersionedContentStoreAdapter}. In
 * `draft` mode ops pass straight through (live editing); in `live`/`history` mode
 * content ops are swallowed (read-only). `select` ops always call `onSelect`.
 */
export function makePresentationAdapter(
  base: VersionedContentStoreAdapter,
  mode: ViewMode,
  historyVersion: string | null,
  onSelect: (sel: Selection) => void,
): ContentStoreAdapter {
  const view = (): ContentSnapshot => {
    if (mode === "live") return base.getLive?.() ?? base.getSnapshot();
    if (mode === "history" && historyVersion !== null) {
      return base.materializeVersion?.(historyVersion) ?? [];
    }
    return base.getDraft?.() ?? base.getSnapshot();
  };
  const readOnly = mode !== "draft";
  return {
    getSnapshot: view,
    apply: (op: HostContentOp): ContentSnapshot => {
      if (op.kind === "select") {
        onSelect({
          targetId: op.targetId,
          contentId: "contentId" in op ? (op.contentId ?? null) : null,
        });
        return view();
      }
      if (readOnly) return view();
      return base.apply(op);
    },
    getDraft: () => base.getDraft?.() ?? base.getSnapshot(),
    ...(base.getLive ? { getLive: () => base.getLive!() } : {}),
    ...(base.publish ? { publish: () => base.publish!() } : {}),
    ...(base.materializeVersion
      ? { materializeVersion: (v: string) => base.materializeVersion!(v) }
      : {}),
  };
}
