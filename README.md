# @stardust-cms/dashboard

An extensible **host-dashboard boilerplate** for building in-iframe visual editors on top of
[`@stardust-cms/iframe-adapter`](https://www.npmjs.com/package/@stardust-cms/iframe-adapter).

Bring your own **content store** (implement `ContentStoreAdapter`) and your own **block types**
(`BlockType[]`), render `<HostShell>`, and you get a working editor: overlay-based
select / insert / move / edit / delete over an embedded site — plus draft/live and version
navigation where your store supports it. No forking required; you implement documented seams.

```bash
npm install @stardust-cms/dashboard @stardust-cms/iframe-adapter frame-link-react frame-link react
```

`react` (>=18) and the other three are **peer dependencies**.

---

## The three seams

You wire the dashboard by supplying three things to `<HostShell>`:

1. **A `ContentStoreAdapter`** — where content lives and how ops mutate it.
2. **A `BlockType[]` registry** — the kinds of content and how to edit them.
3. **Config** — the iframe origin/URL and design dimensions.

Everything else (overlays, palette, side panel, connection status, layout, theme) has sensible
defaults you can override.

---

## Quick start

```tsx
import {
  HostShell,
  type ContentStoreAdapter,
  type BlockType,
} from "@stardust-cms/dashboard";
import "@stardust-cms/dashboard/tokens"; // default theme (override the --sd-* CSS vars to restyle)

// 1. Implement the store seam (or reuse a ready-made adapter — see below).
const store: ContentStoreAdapter = {
  getSnapshot: () => currentSnapshot,          // readonly ContentPayload[]
  apply: (op) => applyToYourStore(op),          // Insert | Move | Select | Delete | Edit → new snapshot
  // optional, for draft/live + history controls:
  publish: () => publishInYourStore(),
  getDraft: () => draftSnapshot(),
  getLive:  () => liveSnapshot(),
  materializeVersion: (v) => snapshotAtVersion(v),
};

// 2. Declare your block types (drives the Palette + SidePanel).
const blockTypes: BlockType[] = [
  {
    type: "text",
    label: "Text",
    defaultValue: () => ({ value: "New text" }),
    renderField: (content, onEdit) => (
      <input value={content.value ?? ""} onChange={(e) => onEdit({ value: e.target.value })} />
    ),
  },
  { type: "image", label: "Image", defaultValue: () => ({ value: "" }) },
];

// 3. Render the shell.
export function Admin() {
  return (
    <HostShell
      iframeOrigin="http://localhost:5174"
      iframeSrc="http://localhost:5174/"
      designWidth={1280}
      designHeight={800}
      store={store}
      blockTypes={blockTypes}
    />
  );
}
```

That's a working editor: the embedded site's `data-cms` targets get overlays, dragging a block
from the palette inserts it, dragging an item moves it, the side panel edits the selected item,
and the overlay delete button removes it — all flowing through your `store.apply(op)` and
re-injected into the iframe.

---

## Using the Versioned Content Engine (reference store)

The [`example/`](./example) folder ships a complete, runnable reference implementation backed by
[`versioned-content-engine`](https://www.npmjs.com/package/versioned-content-engine) —
`createVersionedContentStoreAdapter()` maps host ops to engine operations and adds a draft/live
toggle, a **Publish** button, and a **previous-version** selector. Its Playwright e2e drives the full
loop and asserts that a **deleted item still appears when you inspect a pre-delete version** — the
engine's historical-fidelity guarantee, made visible.

```bash
git clone https://github.com/dcassil/stardust-dashboard
cd stardust-dashboard && pnpm install && pnpm build   # build the shell for the example's file: link
cd example && pnpm install && pnpm demo               # site :5174 + admin :5173
```

Use it as the template for backing the dashboard with any versioned store.

---

## API

### `<HostShell>` props
| Prop | Type | Notes |
|---|---|---|
| `store` | `ContentStoreAdapter` | **required** — the store seam. |
| `blockTypes` | `BlockType[]` | drives Palette + SidePanel + insert defaults (default: empty). |
| `iframeOrigin` / `iframeSrc` | `string` | the embedded site (defaults provided). |
| `designWidth` / `designHeight` | `number` | design canvas size for geometry mapping. |
| `headerOffset` | `number` | fixed offset for overlay projection. |
| `renderStatus?(state, scale)` | render-prop | override the connection-status strip. |
| `renderLayout?(parts)` | render-prop | override the canvas/panel layout. |
| `renderOverlayChrome?(parts)` | render-prop | override the overlay chrome (default: bundled `Overlays`). |
| `children` | `ReactNode` | your palette/side-panel layer (defaults available). |

### `ContentStoreAdapter`
```ts
interface ContentStoreAdapter {
  getSnapshot(): ContentSnapshot;              // readonly ContentPayload[]
  apply(op: HostContentOp): ContentSnapshot;   // returns a FRESH snapshot each call
  publish?(): ContentSnapshot;
  getDraft?(): ContentSnapshot;
  getLive?(): ContentSnapshot;
  materializeVersion?(version: string): ContentSnapshot;
}
type HostContentOp = InsertOp | MoveOp | SelectOp | DeleteOp | EditOp;
```
`apply` **must** return a new snapshot reference each call — the provider relies on identity change
to re-render. The op vocabulary (`InsertOp`/`MoveOp`/`SelectOp`) is re-exported from
`@stardust-cms/iframe-adapter/host`; `DeleteOp`/`EditOp` are added here.

### `BlockType`
```ts
interface BlockType {
  type: string;
  label: string;
  defaultValue?(): CmsContent["value"] | Partial<CmsContent>; // seeded on insert
  renderField?(content: CmsContent, onEdit: (patch: BlockFieldPatch) => void): ReactNode; // SidePanel editor
}
```

### Also exported
- **Components:** `HostShell`, `Palette`, `SidePanel`, `Overlays`, `ConnectionStatus`.
- **Store:** `StoreProvider`, `useContentStore`, `dispatchStoreOp`.
- **Helpers/types:** `findBlockType`, `BlockTypeRegistry`, all op types, and the `DEFAULT_*_CLASS_NAME` constants for the overlay/panel styling seams.

---

## Customizing overlays & theme

- **Overlays** wrap the published unstyled primitives. Pass `renderOverlayChrome`, or use `<Overlays>`
  directly with `renderItemChrome`, `showDeleteButton`, and class-name overrides.
- **Theme** ships as `:root` CSS custom properties (`--sd-bg`, `--sd-accent`, `--sd-danger`, …). Import
  `@stardust-cms/dashboard/tokens` once, then redeclare any `--sd-*` variable under your own `:root`
  to restyle the bundled UI without forking.

---

## Design

The dashboard is deliberately **decoupled from any content store** — the shell package imports no
store (a dependency-cruiser gate enforces it); the store enters only through the `ContentStoreAdapter`
interface. This mirrors the `@stardust-cms/iframe-adapter` principle that the host emits structured
operations rather than mutating a store directly.

## License

MIT © Daniel Cassil
