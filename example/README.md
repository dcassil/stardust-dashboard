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

## The runnable demo (`pnpm demo`)

Beyond the adapter unit tests, this package ships a full, runnable reference
editor that re-bases the SIFR demo/admin onto the `@stardust-cms/dashboard`
boilerplate with this VCE adapter as its store — the initiative's proof artifact,
which also satisfies **SVER-I-0004 REQ-006** (the engine's historical-fidelity
guarantee, made visible in a real iframe editor).

```sh
# From the repo root, build the file-linked shell + its /tokens export first:
pnpm install && pnpm build

# Then in example/:
pnpm install
pnpm demo          # starts site (:5174) + admin (:5173) via concurrently
```

Open the admin at http://localhost:5173. It embeds the site (http://localhost:5174)
in a cross-origin iframe (explicit origins, never `"*"` — NFR-002) and gives you
a working visual editor:

- **`admin/`** — a Vite React app rendering `<HostShell>` from the LOCAL shell
  (`@stardust-cms/dashboard` via the `file:..` link), backed by
  `createVersionedContentStoreAdapter()`, a `BlockType[]` registry (`text` +
  `image`), the bundled `Overlays`/`Palette`/`SidePanel`, and
  `import "@stardust-cms/dashboard/tokens"`.
- **`site/`** — the iframe content app: 4–6 editable `data-cms` targets incl. a
  nested container, using `@stardust-cms/iframe-adapter/iframe` +
  `StardustAdapterProvider`.

### The demo controls the VCE adapter enables

Three controls surface the engine's draft/live/publish/history through the
adapter's optional capability methods:

- **Draft / Live toggle** — flips the injected view between `getDraft()` and
  `getLive()`. Draft edits are invisible in Live until published.
- **Publish** — `adapter.publish()`, advancing live to the current draft; each
  publish records a version.
- **Previous-version selector** — `adapter.materializeVersion(v)`, injecting an
  older version READ-ONLY. Select a **pre-delete** version and the deleted item
  reappears — the historical-fidelity payoff.

### Extending the two seams (adopt with your own store + blocks)

- **Store-adapter seam** — implement `ContentStoreAdapter`
  (`getSnapshot()` + `apply(op)`; optional `publish`/`getLive`/`materializeVersion`)
  against your store and pass it as `<HostShell store={...} />`. The VCE adapter in
  `src/versionedContentStoreAdapter.ts` is the copy-pasteable reference.
- **Block-registry seam** — define a `BlockType[]` (`{ type, label, defaultValue?,
  renderField? }`) and pass it as `blockTypes`. See `admin/blockTypes.tsx`.

### Tests

- `pnpm test` — unit + integration (jsdom), covering the SIFR↔VCE wiring:
  overlay op → adapter → engine → injected snapshot; draft edits invisible in live
  until publish; a pre-delete version shows a deleted item read-only; the
  store-adapter swap and block-type override seams. (Never launches a browser.)
- `pnpm demo:build` — production-builds both apps.
- `pnpm demo:e2e` — the Playwright e2e (`e2e/edit-publish-history.e2e.ts`): the
  full loop against a real browser + real cross-origin iframe — seed → edit →
  preview draft → publish → delete → publish → select the PRE-DELETE version and
  assert the deleted item reappears (SVER-I-0004 REQ-006). Install the browser
  once with `npx playwright install chromium`. A proof still is written to
  `e2e/artifacts/pre-delete-history.png`.
