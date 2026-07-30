# Versioned Content Engine — reference `ContentStoreAdapter`

This example demonstrates the cross-package payoff of `@stardust-cms/dashboard`
(SIFR-I-0007 REQ-002): wiring the published
[`versioned-content-engine`](https://www.npmjs.com/package/versioned-content-engine)
to the dashboard shell's store seam **without the shell ever depending on the
engine** (NFR-001 — the engine lives only here, in `example/`).

## What `createVersionedContentStoreAdapter` demonstrates

`src/versionedContentStoreAdapter.ts` exports
`createVersionedContentStoreAdapter(opts?): VersionedContentStoreAdapter`, an
implementation of the shell's `ContentStoreAdapter` interface. It holds the
engine's append-only `ContentState` and immutable `VersionClock` internally
(threading both immutably) and maps the shell's `HostContentOp` vocabulary onto
the engine's pure operations:

| Shell op    | Engine call      | Notes                                            |
| ----------- | ---------------- | ------------------------------------------------ |
| `InsertOp`  | `createContent`  | Mints a new collection at the drop slot          |
| `MoveOp`    | `moveContent`    | Repositions / re-targets an existing collection  |
| `DeleteOp`  | `deleteContent`  | Appends a version-scoped tombstone               |
| `EditOp`    | `updateContent`  | Appends a new payload for an existing collection |
| `SelectOp`  | *(none)*         | No-op; returns the current snapshot              |

`getSnapshot()` materializes the engine's **draft** view and flattens the
`ReadonlyMap<TargetId, ContentRecord[]>` into the shell's `ContentSnapshot`
(`readonly ContentPayload[]`), ready for `cms/sendElements` injection. Each call
returns a fresh array so the shell's React provider re-injects on change.

The engine's `collectionId` is exposed verbatim as each payload's `contentId`,
so it stays stable across a collection's whole edit history — the id the shell
hands back in a later delete/edit/move maps straight to the collection.

Optional capability methods surface the engine's draft/live/publish/history:

- `publish()` advances the live pointer and returns the new live snapshot.
- `getDraft()` / `getLive()` return the respective snapshots.
- `materializeVersion(v)` returns a read-only snapshot at a historical version.
- `getLiveVersion()` reports the current live version to record and replay later.

## The historical-fidelity payoff

The engine's headline guarantee — a version recorded *before* a delete still
materializes the deleted item afterwards — is surfaced through the adapter and
asserted in `versionedContentStoreAdapter.test.ts` (TC-002): create → publish →
record version → delete → publish, then `materializeVersion(recordedVersion)`
still contains the item, while `getLive()` does not.

## Determinism

Tests inject `createSequenceIdStrategy` + `IntegerVersionClock` so collection
ids (`col-0`, `col-1`, …) and versions are predictable. The default (no options)
is also fully deterministic.

## Running

```sh
pnpm install
pnpm typecheck
pnpm test
```
