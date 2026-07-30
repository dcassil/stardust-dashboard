/**
 * `createVersionedContentStoreAdapter` — the reference `ContentStoreAdapter`
 * (SIFR-I-0007 REQ-002 / Detailed Design §2) that conforms the published
 * `versioned-content-engine` to the `@stardust-cms/dashboard` store seam.
 *
 * This is the cross-package payoff: it is the glue that lets the dashboard shell
 * (which only ever speaks the `HostContentOp` vocabulary and consumes
 * `ContentSnapshot`s) be backed by the append-only, historically-faithful
 * Versioned Content Engine — without the shell ever importing the engine
 * (NFR-001). It therefore lives in this `example/` package, never in `src/**`.
 *
 * ## What it holds
 *
 * The engine is a set of pure `(state, args, deps) => newState` transitions plus
 * an immutable `VersionClock`. Neither is a stateful object, so the adapter owns
 * the mutable cell: it threads the engine's `ContentState` and `VersionClock`
 * immutably, replacing them on every op. Determinism (for tests) comes from the
 * injected `IdStrategy` + `VersionClock` — no wall-clock or randomness leaks in.
 *
 * ## Op → engine mapping (the single contract boundary)
 *
 *  - `InsertOp`  → `createContent`  (mint a brand-new collection at the drop slot)
 *  - `MoveOp`    → `moveContent`    (reposition / re-target an existing collection)
 *  - `DeleteOp`  → `deleteContent`  (append a version-scoped tombstone)
 *  - `EditOp`    → `updateContent`  (append a new payload for an existing collection)
 *  - `SelectOp`  → no-op            (selection mutates no content; returns current snapshot)
 *
 * ## Addressing
 *
 * The engine addresses content by opaque `ContentCollectionId` (stable across a
 * collection's whole version history); the shell/iframe addresses content by the
 * string `contentId` element id. The adapter uses the engine's `collectionId`
 * verbatim as the exposed `contentId`, so a `contentId` the shell hands back in a
 * later `DeleteOp`/`EditOp`/`MoveOp` maps straight to the collection — and stays
 * stable even as edits append new records underneath it.
 *
 * ## Snapshot transform (`materialize` → `ContentPayload[]`)
 *
 * `getSnapshot()` materializes the engine's DRAFT view (`getDraft`), a
 * `ReadonlyMap<TargetId, ContentRecord[]>`, and flattens it into the shell's
 * `ContentSnapshot` (`readonly ContentPayload[]`) — one payload per live record,
 * carrying `{ targetId, contentId, index, content }` exactly as the iframe's
 * `applyContent`/`cms/sendElements` path expects. Every call returns a FRESH
 * array (identity change) so the shell's React provider re-injects.
 *
 * INVARIANT (NFR-003): strict TS, no `any`. The only casts are the sanctioned
 * branded-id boundary casts (opaque string/number → `TargetId`/`Version`), which
 * the engine's type layer explicitly reserves for adapters.
 */

import type {
  ContentStoreAdapter,
  ContentSnapshot,
  HostContentOp,
  DeleteOp,
  EditOp,
} from "@stardust-cms/dashboard";
import type {
  InsertOp,
  MoveOp,
} from "@stardust-cms/iframe-adapter/host";
import type {
  CmsContent,
  ContentKind,
  ContentPayload,
} from "@stardust-cms/iframe-adapter/protocol";
import {
  createContent,
  updateContent,
  moveContent,
  deleteContent,
  publish,
  getDraft,
  getLive,
  materialize,
  createSequenceIdStrategy,
  IntegerVersionClock,
  type ContentState,
  type ContentSnapshot as EngineSnapshot,
  type ContentRecord,
  type ContentCollectionId,
  type TargetId,
  type Version,
  type IdStrategy,
  type VersionClock,
  type OperationDeps,
} from "versioned-content-engine";

/* -------------------------------------------------------------------------- */
/* Content-type map                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The payload the engine stores per record: the display-bearing fields of a
 * {@link CmsContent}, minus the id (the id lives on the engine record) and the
 * `type` (the engine record's discriminant). Kept in sync with `CmsContent` so
 * the snapshot transform is a total, lossless reconstruction.
 */
export interface VceContentPayload {
  readonly value?: string;
  readonly styleGroup?: string;
  readonly column?: boolean;
  readonly data?: CmsContent["data"];
}

/**
 * The engine content-type map for this adapter: every {@link ContentKind} maps
 * to the same {@link VceContentPayload} shape. Making the engine generic over
 * this map keeps `type`/`payload` correlated and lets `materialize` return
 * well-typed records the transform can read without `any`.
 */
export type VceContentMap = {
  readonly [K in ContentKind]: VceContentPayload;
};

/* -------------------------------------------------------------------------- */
/* Branded-id boundary casts (adapter-permitted, per engine type layer)       */
/* -------------------------------------------------------------------------- */

const asTargetId = (raw: string): TargetId => raw as unknown as TargetId;
const asCollectionId = (raw: string): ContentCollectionId =>
  raw as unknown as ContentCollectionId;
const asVersion = (raw: number): Version => raw as unknown as Version;

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Options for {@link createVersionedContentStoreAdapter}. All are optional; the
 * defaults produce a fully deterministic adapter (fixed id sequence + integer
 * clock at 0) so tests need inject nothing, while callers who want real-world
 * ids/clocks pass their own strategies.
 */
export interface VersionedContentStoreAdapterOptions {
  /** Injected id source. Default: a long deterministic sequence. */
  readonly idStrategy?: IdStrategy;
  /** Injected version clock. Default: `new IntegerVersionClock(0)`. */
  readonly clock?: VersionClock;
  /** Initial engine state. Default: empty. */
  readonly initialState?: ContentState<VceContentMap>;
}

/**
 * The reference adapter plus the small amount of version introspection the demo
 * controls need (recording a version to inspect later). Extends the shell's
 * `ContentStoreAdapter` so it drops straight into `HostShell`.
 */
export interface VersionedContentStoreAdapter extends ContentStoreAdapter {
  /**
   * The current LIVE version as a string, suitable to record now and replay
   * later via {@link ContentStoreAdapter.materializeVersion}. This is the seam
   * the historical-fidelity flow uses: record before a destructive edit, then
   * inspect that version after publishing.
   */
  getLiveVersion(): string;
}

/* -------------------------------------------------------------------------- */
/* Default deterministic strategy                                             */
/* -------------------------------------------------------------------------- */

function defaultIdStrategy(): IdStrategy {
  // A generous fixed sequence keeps the default adapter deterministic without a
  // test having to supply one. Distinct id vs collectionId spaces so the two
  // never collide.
  const n = 512;
  const ids: string[] = [];
  const collectionIds: string[] = [];
  for (let i = 0; i < n; i += 1) {
    ids.push(`id-${i}`);
    collectionIds.push(`col-${i}`);
  }
  return createSequenceIdStrategy(ids, collectionIds);
}

/* -------------------------------------------------------------------------- */
/* Snapshot transform: engine ReadonlyMap → ContentPayload[]                  */
/* -------------------------------------------------------------------------- */

/**
 * Flatten a materialized engine snapshot into the shell's ordered
 * `ContentPayload[]`. One payload per live record; `contentId` is the stable
 * `collectionId`; targets are emitted in map-iteration order and records in
 * their already-reindexed order.
 */
function toContentSnapshot(engine: EngineSnapshot<VceContentMap>): ContentSnapshot {
  const out: ContentPayload[] = [];
  for (const [, records] of engine) {
    for (const record of records) {
      out.push(recordToPayload(record));
    }
  }
  return out;
}

function recordToPayload(record: ContentRecord<VceContentMap>): ContentPayload {
  const content: CmsContent = {
    id: String(record.collectionId),
    type: record.type,
    ...(record.payload.value !== undefined ? { value: record.payload.value } : {}),
    ...(record.payload.styleGroup !== undefined
      ? { styleGroup: record.payload.styleGroup }
      : {}),
    ...(record.payload.column !== undefined ? { column: record.payload.column } : {}),
    ...(record.payload.data !== undefined ? { data: record.payload.data } : {}),
  };
  return {
    targetId: String(record.target),
    contentId: String(record.collectionId),
    index: record.index,
    content,
  };
}

/**
 * Extract the {@link VceContentPayload} display fields out of an insert op's
 * loosely-typed `payload` bag, dropping `type` (which becomes the discriminant).
 */
function readInsertPayload(payload: InsertOp["payload"]): VceContentPayload {
  const { value, styleGroup, column, data } = payload as {
    value?: unknown;
    styleGroup?: unknown;
    column?: unknown;
    data?: unknown;
  };
  return {
    ...(typeof value === "string" ? { value } : {}),
    ...(typeof styleGroup === "string" ? { styleGroup } : {}),
    ...(typeof column === "boolean" ? { column } : {}),
    ...(data !== undefined ? { data: data as CmsContent["data"] } : {}),
  };
}

function isContentKind(type: string): type is ContentKind {
  return type === "text" || type === "number" || type === "image" || type === "container";
}

/* -------------------------------------------------------------------------- */
/* Factory                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Build a {@link VersionedContentStoreAdapter} backed by the Versioned Content
 * Engine. Holds `ContentState` + `VersionClock` internally, threading each
 * immutably: every op replaces the pair with the engine's fresh result.
 */
export function createVersionedContentStoreAdapter(
  options: VersionedContentStoreAdapterOptions = {},
): VersionedContentStoreAdapter {
  let state: ContentState<VceContentMap> =
    options.initialState ?? new Map<TargetId, readonly ContentRecord<VceContentMap>[]>();
  let clock: VersionClock = options.clock ?? new IntegerVersionClock(0);
  const idStrategy: IdStrategy = options.idStrategy ?? defaultIdStrategy();

  const deps = (): OperationDeps => ({ idStrategy, clock });

  /** Materialize the current DRAFT view and flatten to the shell snapshot. */
  const snapshot = (): ContentSnapshot =>
    toContentSnapshot(getDraft<VceContentMap>(state, clock));

  const applyInsert = (op: InsertOp): void => {
    const type = isContentKind(op.payload.type) ? op.payload.type : "text";
    state = createContent<VceContentMap>(
      state,
      {
        target: asTargetId(op.targetId),
        index: op.index,
        type,
        payload: readInsertPayload(op.payload),
      },
      deps(),
    );
  };

  const applyMove = (op: MoveOp): void => {
    const collectionId = op.from.contentId;
    if (collectionId === undefined) {
      // A move with no moved-content id has nothing to relocate.
      return;
    }
    state = moveContent<VceContentMap>(
      state,
      {
        collectionId: asCollectionId(collectionId),
        source: asTargetId(op.from.targetId),
        dest: asTargetId(op.to.targetId),
        index: op.to.index,
      },
      deps(),
    );
  };

  const applyDelete = (op: DeleteOp): void => {
    state = deleteContent<VceContentMap>(
      state,
      {
        target: asTargetId(op.targetId),
        collectionId: asCollectionId(op.contentId),
      },
      deps(),
    );
  };

  const applyEdit = (op: EditOp): void => {
    // The engine's `updateContent` inherits target/index/type from the current
    // winner, so the adapter needs only the collection + the new payload fields.
    // The winner's `type` is required by the engine args; we look it up in the
    // current draft so the payload is checked against the right discriminant.
    const winner = findWinner(getDraft<VceContentMap>(state, clock), op.contentId);
    if (winner === undefined) {
      return;
    }
    const nextPayload: VceContentPayload = {
      ...winner.payload,
      ...(op.patch.value !== undefined ? { value: op.patch.value } : {}),
      ...(op.patch.styleGroup !== undefined ? { styleGroup: op.patch.styleGroup } : {}),
      ...(op.patch.column !== undefined ? { column: op.patch.column } : {}),
      ...(op.patch.data !== undefined ? { data: op.patch.data } : {}),
    };
    state = updateContent<VceContentMap>(
      state,
      {
        collectionId: asCollectionId(op.contentId),
        type: winner.type,
        payload: nextPayload,
      },
      deps(),
    );
  };

  const apply = (op: HostContentOp): ContentSnapshot => {
    switch (op.kind) {
      case "insert":
        applyInsert(op);
        break;
      case "move":
        applyMove(op);
        break;
      case "delete":
        applyDelete(op);
        break;
      case "edit":
        applyEdit(op);
        break;
      case "select":
        // Selection mutates no content.
        break;
    }
    // Fresh snapshot reference every call (contract: React identity change).
    return snapshot();
  };

  return {
    getSnapshot: () => snapshot(),
    apply,
    publish: () => {
      const result = publish<VceContentMap>(state, clock);
      state = result.state;
      clock = result.clock;
      // After publish, the live view is what had been the draft.
      return toContentSnapshot(getLive<VceContentMap>(state, clock));
    },
    getDraft: () => snapshot(),
    getLive: () => toContentSnapshot(getLive<VceContentMap>(state, clock)),
    materializeVersion: (version: string) => {
      const numeric = Number(version);
      if (!Number.isFinite(numeric)) {
        return [];
      }
      return toContentSnapshot(materialize<VceContentMap>(state, asVersion(numeric)));
    },
    getLiveVersion: () => String(clock.live()),
  };
}

/**
 * Find the record for a given collectionId (exposed contentId) in a materialized
 * snapshot. Used by `updateContent` mapping to recover the collection's current
 * `type`/`payload` (the engine inherits target/index/type, so only these are
 * needed). Linear scan is fine at demo scale.
 */
function findWinner(
  engine: EngineSnapshot<VceContentMap>,
  contentId: string,
): ContentRecord<VceContentMap> | undefined {
  for (const [, records] of engine) {
    for (const record of records) {
      if (String(record.collectionId) === contentId) {
        return record;
      }
    }
  }
  return undefined;
}
