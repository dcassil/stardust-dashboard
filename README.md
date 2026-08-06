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

`renderLayout` is the Option B escape hatch. When you supply it, your layout owns the region
behaviors: the default landmarks, responsive sidebar collapse, and modal focus-trap / restore /
Escape handling live in the region primitives composed by the default `AdminShell`, so
`renderLayout` does not carry a byte-for-byte behavior guarantee. It is also bypassed in preview
mode, where `HostShell` renders the full-bleed canvas directly.

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
- **Theme** is opt-in CSS. Use `tokens` when you only need the variables plus legacy bundled chrome;
  use `theme.css` when you want the full default admin theme.

### Importing CSS

```tsx
import "@stardust-cms/dashboard/tokens";
```

The `tokens` entry provides the `--sd-*` design tokens plus minimal structural rules for the
originally-bundled `admin-*` / `ov-*` classes. Use it when you want the tokens (and legacy bundled
chrome) only.

```tsx
import "@stardust-cms/dashboard/theme.css";
```

`theme.css` is the batteries-included FULL default theme. It `@import`s the token layer and adds
token-driven rules for every `sd-*` primitive (overlay + panel + shell) plus the migrated admin
layout. Use it for a complete good-looking admin from one import. `theme.css` composes `tokens.css`;
importing the package JS does not pull either CSS, so both entries are explicit side-effect imports.

### Token catalog

| Group | Tokens |
| --- | --- |
| Surfaces | `--sd-bg`, `--sd-panel-bg`, `--sd-panel-fg`, `--sd-muted`, `--sd-border`, `--sd-canvas-bg`, `--sd-surface-hover`, `--sd-scrim` |
| Accents | `--sd-accent`, `--sd-accent-soft`, `--sd-selected`, `--sd-selected-soft` |
| Status | `--sd-ok`, `--sd-warn`, `--sd-danger` |
| Controls (overlay affordances) | `--sd-button-bg`, `--sd-button-fg`, `--sd-button-hover-bg`, `--sd-handle-bg`, `--sd-handle-fg`, `--sd-insert-zone`, `--sd-insert-zone-active` |
| Form fields | `--sd-field-bg`, `--sd-field-fg`, `--sd-field-border`, `--sd-label-fg` |
| Focus ring | `--sd-focus-ring`, `--sd-focus-ring-width` |
| Shape & rhythm | `--sd-radius`, `--sd-radius-sm`, `--sd-gap`, `--sd-gap-sm`, `--sd-gap-lg`, `--sd-ring-width`, `--sd-shadow`, `--sd-shadow-sm` |
| Layout geometry | `--sd-sidebar-width`, `--sd-panel-width`, `--sd-topbar-height` |
| Stacking | `--sd-z-overlay`, `--sd-z-status`, `--sd-z-modal` |
| Typography | `--sd-font-family` |

### Stable class hooks

These `sd-*` names are stable, targetable selectors:

- **Overlay:** `sd-content-overlay` (+ `sd-content-overlay__item`), `sd-selection-ring`
  (+ `sd-selection-ring--selected`), `sd-actions`, `sd-edit-button`, `sd-remove-button`,
  `sd-move-handle`, `sd-insert-zone`.
- **Panel:** `sd-side-panel`, `sd-panel-section`, `sd-edit-panel`, `sd-field-editor`,
  `sd-style-panel`, `sd-presence` (+ `sd-presence__item`, `sd-presence__dot`), `sd-palette`,
  `sd-sidebar` (+ BEM sub-elements `sd-sidebar__header`, `sd-sidebar__body`,
  `sd-sidebar__footer`, `sd-sidebar__nav`, `sd-sidebar__tabs`, `sd-sidebar__tab`,
  `sd-sidebar__tab-content`, `sd-sidebar__trigger`, `sd-sidebar__collapse`,
  `sd-sidebar__panel` and states `sd-sidebar--open`, `sd-sidebar--collapsed`).
- **Shell regions:** `sd-shell-root`, `sd-topbar` (+ `sd-topbar__status`),
  `sd-main-content`, `sd-iframe-area`, `sd-overlay-layer`, `sd-modal-host`
  (+ `sd-modal-host__dialog`), `sd-footer`, `sd-command-region`.

These names are a STABLE contract, single-sourced as exported constants in
`overlays/overlaysTypes.ts`, `blocks/panelTypes.ts`, and `layout/layoutTypes.ts`. A DASH-T-0046
emitted-vs-styled test backstops the catalog so it cannot drift.

### Override recipes

1. Token redefinition (global re-theme): import `theme.css`, then redeclare any `--sd-*` tokens in a
   later stylesheet.

```tsx
import "@stardust-cms/dashboard/theme.css";
import "./admin-theme.css";
```

```css
:root {
  --sd-bg: #fff7ed;
  --sd-panel-fg: #1f2937;
  --sd-accent: #2563eb;
  --sd-danger: #b91c1c;
}
```

1. `sd-*` class targeting (restyle one primitive): keep the default structure and target one stable
   hook.

```css
.sd-edit-button {
  border-radius: 999px;
  background: var(--sd-accent);
  color: var(--sd-button-fg);
  box-shadow: var(--sd-shadow-sm);
}

.sd-edit-button:hover {
  background: var(--sd-button-hover-bg);
}
```

1. Per-instance `className` / `style` (restyle one instance): every primitive merges `className`
   OVER its default hook and applies `style`.

```tsx
import { EditButton } from "@stardust-cms/dashboard";

<EditButton
  className="my-edit"
  style={{
    background: "var(--sd-accent)",
    color: "var(--sd-button-fg)",
  }}
/>
```

### Dark theme

Use token redefinition only; no class or component changes are required.

```css
:root {
  --sd-bg: #0f172a;
  --sd-panel-fg: #e2e8f0;
  --sd-accent: #14b8a6;
  --sd-danger: #22c55e;
}
```

This is the validated Use Case 2 recipe, backstopped by the DASH-T-0046 dark-recipe test. The same
technique reproduces a dark sidebar rail without forking.

### Demo migration

The package theme now owns the admin-chrome CSS: layout grid, panel/section, fields, palette,
buttons, and status. The demo consumes `theme.css` and keeps only demo-specific styling: brand
identity, versioning UI, palette icon decoration, drop-zone ornamentation, site content, and the
dark-rail token overrides. Full migration inventory is tracked in Metis DASH-T-0045 / DEMO-I-0001.

---

## Behavior layer — `AdminProvider` (0.2)

The dashboard ships a **headless, UI-free behavior layer** (`AdminProvider`) that owns all
non-visual admin state: editing (selection + session + imperative actions + lifecycle events),
shared UI state (sidebar / modal / overlay / layout), and command + extension registries. The
bundled `HostShell` is just one composition on top of it — **any** custom UI reaches the exact
same capabilities via focused hooks, and the behavior works with **zero bundled UI**.

### Surface

| Hook | Returns |
| --- | --- |
| `useSelection()` | `{ selectedTargetId, selectedContentId, selectedRef }` |
| `useEditingState()` | `{ isEditing, editingRef }` |
| `useEditingActions()` | `{ select, startEditing, stopEditing, add, remove, move, change }` |
| `useSidebarState()` | `{ open, collapsed, activeTab, setOpen, toggle, collapse, setActiveTab }` |
| `useModalState()` | `{ stack, open(id, payload?), close(id?), isOpen(id) }` |
| `useOverlayState()` | `{ mode, activeLayer, setMode, setActiveLayer }` — owns `edit`\|`preview` |
| `useLayoutState()` | `{ visibleRegions, breakpoint, setRegionVisible }` |
| `useRegisterCommand(cmd)` / `useCommands(ctx?)` | register / read `when`-filtered commands |
| `useRegisterExtension(kind, contribution)` / `useExtensions(kind)` | `commands`\|`actions`\|`panels`\|`tools` |

**Action → store-op mapping** (every action routes through the injected store's `apply`; content
callbacks fire **post-commit, once each**):

| Action | Store op | Events |
| --- | --- | --- |
| `select(ref\|null)` | `select` (inert) | `onSelect` |
| `startEditing(ref)` | `select` (inert) | `onSelect`, `onEditingStart` |
| `stopEditing()` | — | `onEditingStop` |
| `add(op)` | `insert` | `onInsert`, `onContentChange`, `onSelect` (auto-select) |
| `remove(op)` | `delete` | `onRemove`, `onContentChange` |
| `move(op)` | `move` | `onMove`, `onContentChange` |
| `change(op)` | `edit` | `onContentChange` |

### Standalone example — drive editing with your own UI (no bundled overlay/panel)

```tsx
import { EditingProvider, useEditingActions, useEditingState } from "@stardust-cms/dashboard";

function MyToolbar() {
  const { startEditing, change, stopEditing } = useEditingActions();
  const { isEditing } = useEditingState();
  return (
    <div>
      <button onClick={() => startEditing({ targetId: "hero", contentId: "title" })}>Edit title</button>
      <button onClick={() => {
        change({ kind: "edit", targetId: "hero", contentId: "title", patch: { value: "Hello" } });
        stopEditing();
      }}>Save</button>
      <span>{isEditing ? "editing" : "idle"}</span>
    </div>
  );
}

// `onEditingStart` opens your modal; `onContentChange` persists the draft — no bundled UI needed.
<EditingProvider store={adapter} onEditingStart={openMyModal} onContentChange={saveDraft}>
  <MyToolbar />
</EditingProvider>
```

(This snippet is mirrored in `src/admin/usageExample.test.tsx`, which is compiled + run so it can't
drift from the shipped API.)

### Reserved seams (designed for later)

`useRegisterExtension`/`useExtensions` accept four **implemented** kinds now —
`commands` · `actions` · `panels` · `tools`. Four more are **reserved** in the types
(`navigation` · `permissions` · `currentUser` · `resources`): registering one throws
**"not implemented this round"** (and is flagged at compile time — its `ExtensionContribution`
resolves to an uninhabitable type). They are reserved so future initiatives add
`useNavigation`/`usePermissions`/`useCurrentUser`/`useResources` + their App-Shell mount points
**additively**, with no breaking change to the registration API.

### Back-compat

`useHostSelection()` / `HostSelection` are unchanged — now fed from the controller's selection.
Preview mode moved into the behavior layer: the dog-ear toggle drives
`useOverlayState().setMode("preview")`, so overlay / app-shell / preview-toggle share one source of
truth (`HostShell.previewable` still controls whether the affordance is shown).

---

## Design

The dashboard is deliberately **decoupled from any content store** — the shell package imports no
store (a dependency-cruiser gate enforces it); the store enters only through the `ContentStoreAdapter`
interface. This mirrors the `@stardust-cms/iframe-adapter` principle that the host emits structured
operations rather than mutating a store directly.

## License

MIT © Daniel Cassil
