/**
 * `ContentStoreAdapter` — the load-bearing store seam of `@stardust-cms/dashboard`
 * (SIFR-I-0007 REQ-001 / Detailed Design §1).
 *
 * The dashboard shell never talks to a concrete content store. Instead every
 * edit intent leaves the overlay/panel layer as one of a small set of structured
 * {@link HostContentOp}s, and the shell hands them to an injected
 * `ContentStoreAdapter`. The adapter applies the op and returns the fresh
 * {@link ContentSnapshot}; the shell re-injects that snapshot into the iframe via
 * `cms/sendElements`. This is the single seam that lets any store — the in-memory
 * demo store here, the Versioned Content Engine in SIFR-T-0032 — back the editor.
 *
 * ## Op vocabulary (the single contract boundary)
 *
 * `HostContentOp` reuses the SIFR host op vocabulary from
 * `@stardust-cms/iframe-adapter/host` (`InsertOp | MoveOp | SelectOp`) verbatim
 * and adds one store-level op, {@link DeleteOp}. This mirrors the demo's
 * `StoreOperation` union so an adapter ported from the demo consumes the ops with
 * no glue. Field editing is expressed as an {@link EditOp}, kept optional in the
 * union so a store that does not support in-place field edits still conforms via
 * the same `apply` entry point.
 *
 * Field names are deliberately aligned with the existing ops:
 *  - `InsertOp` / `MoveOp` / `SelectOp` are imported unchanged (never re-declared).
 *  - `DeleteOp` carries `{ targetId, contentId }` — the same (target, id)
 *    addressing `SelectOp` and the demo delete use, so a delete can be reversed
 *    against the snapshot's slot ordering.
 *
 * INVARIANT (NFR-001): this module imports ONLY the published host + protocol
 * types. It never imports a concrete store or `versioned-content-engine`.
 * INVARIANT (NFR-003): strict TS, no `any`; the op union is a closed
 * discriminated union on `kind`.
 */

import type {
  InsertOp,
  MoveOp,
  SelectOp,
} from "@stardust-cms/iframe-adapter/host";
import type {
  CmsContent,
  ContentPayload,
} from "@stardust-cms/iframe-adapter/protocol";

/* -------------------------------------------------------------------------- */
/* Snapshot                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * An ordered snapshot of all content, ready for `cms/sendElements` injection.
 *
 * Each element is the published {@link ContentPayload} — no bespoke/parallel
 * snapshot element type is invented (SIFR-T-0031 AC). The published adapter
 * exposes `ContentPayload` but not an aggregate snapshot type, so the aggregate
 * (an ordered, readonly list of payloads) is named here, exactly as the SIFR
 * demo store defined it.
 */
export type ContentSnapshot = readonly ContentPayload[];

/**
 * A package-owned seed item: enough information to build one
 * {@link ContentPayload} for `cms/sendElements`.
 */
export interface SeedItem {
  targetId: string;
  index: number;
  content: CmsContent;
}

/* -------------------------------------------------------------------------- */
/* Op vocabulary                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Remove an existing content item, addressed by target + id.
 *
 * NEW in this package: the host overlay vocabulary
 * (`@stardust-cms/iframe-adapter/host`) is insert/move/select only — delete is a
 * store-level editing concern. Shape and field names match the SIFR demo store's
 * delete op so the ported binding consumes it unchanged.
 */
export interface DeleteOp {
  kind: "delete";
  /** The target the deleted item lives in. */
  targetId: string;
  /** The id of the content item to remove. */
  contentId: string;
}

/**
 * Edit fields of an existing content item, addressed by target + id.
 *
 * Store-level op (not part of the host overlay vocabulary). `patch` carries the
 * changed {@link CmsContent} fields (e.g. `{ value }` for a text/image edit).
 * Optional in {@link HostContentOp}: stores that cannot edit fields in place
 * still conform — they simply never receive one.
 */
export interface EditOp {
  kind: "edit";
  /** The target the edited item lives in. */
  targetId: string;
  /** The id of the content item to edit. */
  contentId: string;
  /** The changed fields of the item. */
  patch: Partial<Pick<CmsContent, "value" | "styleGroup" | "column" | "data">>;
}

/**
 * The union of every operation the dashboard shell hands to a
 * {@link ContentStoreAdapter}.
 *
 * `InsertOp | MoveOp | SelectOp` are the SIFR host ops, reused verbatim as the
 * single contract boundary (REQ-001). `DeleteOp` and `EditOp` are the two
 * store-level editing ops. `SelectOp` mutates no content — an adapter treats it
 * as a no-op and returns the current snapshot — but it is part of the union so
 * the shell can route every overlay/panel intent through one `apply` entry point.
 */
export type HostContentOp = InsertOp | MoveOp | SelectOp | DeleteOp | EditOp;

/** The op kinds an adapter may receive. Handy for exhaustiveness checks. */
export type HostContentOpKind = HostContentOp["kind"];

/* -------------------------------------------------------------------------- */
/* Adapter interface                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The public store seam. Any content store conforms by implementing the two
 * required methods; richer stores (e.g. the Versioned Content Engine) add the
 * optional capability methods so publishing / draft-live / historical
 * materialization surface through the same object.
 *
 * The interface is deliberately minimal and synchronous (`apply` returns a
 * snapshot, not a promise) per Detailed Design §1 — the shell re-injects the
 * returned snapshot immediately. A store that must do async work should apply
 * synchronously to its in-memory projection and reconcile out of band.
 */
export interface ContentStoreAdapter {
  /** The current content as `cms/sendElements`-ready payloads, ordered. */
  getSnapshot(): ContentSnapshot;

  /**
   * Apply one structured {@link HostContentOp}; return the resulting snapshot.
   *
   * A `select` op mutates nothing and returns the current snapshot unchanged.
   * Returned snapshots must be fresh references (never a mutation of a
   * previously returned snapshot) so React consumers see a changed identity.
   */
  apply(op: HostContentOp): ContentSnapshot;

  /* --- Optional capability methods (stores without them still conform) --- */

  /** Publish the current draft, advancing live. Versioned stores only. */
  publish?(): ContentSnapshot;

  /** The current draft snapshot. Defaults to {@link getSnapshot} when absent. */
  getDraft?(): ContentSnapshot;

  /** The current live (published) snapshot. Versioned stores only. */
  getLive?(): ContentSnapshot;

  /** Materialize a specific historical version, read-only. Versioned stores only. */
  materializeVersion?(version: string): ContentSnapshot;

  /**
   * Pin the adapter's viewed version, or pass `null` to return to its editable
   * current view. Versioned stores may return a snapshot, but the shell will
   * always read `getSnapshot()` after the pointer changes.
   */
  setViewVersion?(version: string | number | null): unknown;
}

/* -------------------------------------------------------------------------- */
/* Dispatch helper                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Apply an op (or `null`) to an adapter, mirroring the host's `dispatchOp`
 * fan-out pattern. Returns the resulting snapshot, or the adapter's current
 * snapshot when the op is `null` (a no-op drop). Centralizes the "null op =
 * current snapshot" convention so call sites stay uniform.
 */
export function dispatchStoreOp(
  store: ContentStoreAdapter,
  op: HostContentOp | null,
): ContentSnapshot {
  if (op === null) {
    return store.getSnapshot();
  }
  return store.apply(op);
}
