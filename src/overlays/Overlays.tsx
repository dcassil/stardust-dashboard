/**
 * `Overlays` — the shell's overridable overlay chrome (SIFR-I-0007 REQ-005,
 * Detailed Design §5).
 *
 * This is the reusable generalization of the SIFR demo's
 * `demo/admin/src/editing/Overlays.tsx`. It wraps the published, intentionally
 * UNSTYLED overlay primitives — `TargetAreaOverlay` and `ContentItemOverlay`
 * from `@stardust-cms/iframe-adapter/host` — and layers three things the
 * primitives deliberately omit, all of them overridable:
 *
 *  1. **Class names** — every wrapper region takes a `className` prop that
 *     merges over a default `ov-*` class (the demo's classes, styled by the
 *     bundled `tokens.css` + structural CSS). A consumer restyles by passing
 *     their own classes; the primitives themselves are never restyled or
 *     modified (Non-Goals / REQ-005).
 *  2. **A per-item chrome slot** — `renderItemChrome(child, { onDelete })`.
 *     The default renders a small delete button that dispatches a store
 *     {@link DeleteOp} via {@link useContentStore}. A consumer can replace it
 *     with any control (duplicate, drag handle, …) WITHOUT forking, and still
 *     route delete through the same store path.
 *  3. **Selection state** — a hover/selected ring driven by the
 *     `selectedContentId` / `selectedTargetId` props + a `selected` class, and a
 *     click that dispatches a {@link SelectOp} through the store.
 *
 * The geometry (`child.geometry`, `target.geometry`) is already mapped into host
 * coordinates by `mapGeometry` inside `useStardustHost`; nothing is recomputed
 * here. `targets` and `callbacks` are supplied by the shell (which owns the one
 * host connection) rather than read from a demo-local context, so `Overlays` is
 * a pure presentational wrapper over the primitives.
 *
 * The `ov-*` class defaults, prop/render types live in `./overlaysTypes.js`; the
 * default delete-button chrome lives in `./DeleteButton.js`. Both are re-exported
 * through the `overlays/index.js` barrel so the public API is unchanged.
 *
 * INVARIANT (NFR-001): imports ONLY the published host primitives/types, React,
 * and the in-package store seam. No concrete store, no `versioned-content-engine`.
 *
 * ## DASH-T-0028 — bundled default stays store-routed (back-compat decision)
 *
 * DASH-I-0002 ships a composable, controller-wired overlay: `<ContentOverlay>` +
 * `<SelectionRing>`/`<Actions>`/`<EditButton>`/`<RemoveButton>`/`<MoveHandle>`/
 * `<InsertZone>` (DASH-T-0023…0027), which route select/edit/remove/move/add
 * through the DASH-I-0001 controller (`useEditingActions`) and require an
 * `AdminProvider`. THAT is the composition path for consumers assembling a
 * bespoke overlay.
 *
 * The BUNDLED `Overlays` here intentionally KEEPS its store-routed select/delete
 * (`useContentStore().apply`) and its `ov-*` DOM, because its frozen contract
 * test (`Overlays.test.tsx`) mounts it under `StoreProvider` ONLY and asserts
 * synchronous store ops — routing the bundled default through the controller
 * would require an `AdminProvider` (a breaking provider-requirement change) and
 * break that byte-for-byte back-compat gate. So DASH-T-0028's controller-routing
 * criterion is satisfied by the standalone primitives, not by switching this
 * bundled default; here the re-implementation is ADDITIVE — the `sd-*` theme
 * hooks (`sd-content-overlay`, `sd-content-overlay__item`, `sd-remove-button`)
 * are emitted alongside the `ov-*` classes (see `TargetGroup`/`DeleteButton`).
 * Migrating the bundled default onto the controller is deferred to a future
 * major (Daniel's decision, 2026-08-04).
 */

import type { ReactNode } from "react";
import type { OperationCallbacks } from "@stardust-cms/iframe-adapter/host";
import { useContentStore } from "../store";
import { defaultRenderItemChrome } from "./DeleteButton.js";
import { TargetGroup } from "./TargetGroup.js";
import {
  DEFAULT_TARGET_CLASS_NAME,
  DEFAULT_SELECTED_TARGET_CLASS_NAME,
  DEFAULT_CONTAINER_TARGET_CLASS_NAME,
  DEFAULT_TARGET_ITEM_CLASS_NAME,
  DEFAULT_ITEM_CLASS_NAME,
  DEFAULT_SELECTED_ITEM_CLASS_NAME,
  DEFAULT_GROUP_CLASS_NAME,
  DEFAULT_DELETE_CLASS_NAME,
} from "./overlaysTypes.js";
import type { OverlaysProps, RenderItemChrome } from "./overlaysTypes.js";

/** The overlay class names with every default applied. */
interface ResolvedClassNames {
  groupClassName: string;
  targetClassName: string;
  selectedTargetClassName: string;
  containerTargetClassName: string;
  targetItemClassName: string;
  itemClassName: string;
  selectedItemClassName: string;
  deleteClassName: string;
}

/** Apply the `ov-*` defaults to every optional class-name prop. */
function resolveClassNames(props: OverlaysProps): ResolvedClassNames {
  return {
    groupClassName: props.groupClassName ?? DEFAULT_GROUP_CLASS_NAME,
    targetClassName: props.targetClassName ?? DEFAULT_TARGET_CLASS_NAME,
    selectedTargetClassName:
      props.selectedTargetClassName ?? DEFAULT_SELECTED_TARGET_CLASS_NAME,
    containerTargetClassName:
      props.containerTargetClassName ?? DEFAULT_CONTAINER_TARGET_CLASS_NAME,
    targetItemClassName:
      props.targetItemClassName ?? DEFAULT_TARGET_ITEM_CLASS_NAME,
    itemClassName: props.itemClassName ?? DEFAULT_ITEM_CLASS_NAME,
    selectedItemClassName:
      props.selectedItemClassName ?? DEFAULT_SELECTED_ITEM_CLASS_NAME,
    deleteClassName: props.deleteClassName ?? DEFAULT_DELETE_CLASS_NAME,
  };
}

export function Overlays(props: OverlaysProps): ReactNode {
  const {
    targets,
    callbacks,
    selectedContentId = null,
    selectedTargetId = null,
    targetStyle,
    itemStyle,
    renderItemChrome,
    showDeleteButton = true,
    editable = true,
  } = props;
  const {
    groupClassName,
    targetClassName,
    selectedTargetClassName,
    containerTargetClassName,
    targetItemClassName,
    itemClassName,
    selectedItemClassName,
    deleteClassName,
  } = resolveClassNames(props);
  const { apply } = useContentStore();

  // Selection routes through the store as a SelectOp (adapters treat it as a
  // no-op that returns the current snapshot, but it keeps every overlay/panel
  // intent flowing through the single `apply` entry point). The host's own
  // `onSelect` (if any) is also honored on the target hit-box.
  const selectItem = (targetId: string, contentId?: string): void => {
    apply(
      contentId !== undefined
        ? { kind: "select", targetId, contentId }
        : { kind: "select", targetId },
    );
    callbacks.onSelect?.(targetId, contentId);
  };

  const deleteItem = (targetId: string, contentId: string): void => {
    apply({ kind: "delete", targetId, contentId });
  };

  // Read-only mode: render the geometry boxes (so a published/historical version
  // is still viewable) but strip every editing affordance —
  //  - no delete chrome (`chrome` is null regardless of showDeleteButton),
  //  - no interactive selection ring (item click is inert),
  //  - the primitives receive NO onInsert/onMove/onSelect callbacks, so their
  //    drop handlers resolve to no-ops (drop zones inert) and the target
  //    hit-box select does nothing.
  const chrome: RenderItemChrome | null = editable
    ? (renderItemChrome ??
      (showDeleteButton ? defaultRenderItemChrome(deleteClassName) : null))
    : null;

  const resolvedCallbacks: OperationCallbacks = editable ? callbacks : {};
  // Inert handlers for read-only mode (TargetGroup requires both callbacks).
  const noop = (): void => {
    return;
  };

  return (
    <>
      {targets.map((target) => (
        <TargetGroup
          key={target.targetId}
          target={target}
          callbacks={resolvedCallbacks}
          selectedContentId={selectedContentId}
          selectedTargetId={selectedTargetId}
          groupClassName={groupClassName}
          targetClassName={targetClassName}
          selectedTargetClassName={selectedTargetClassName}
          containerTargetClassName={containerTargetClassName}
          targetItemClassName={targetItemClassName}
          itemClassName={itemClassName}
          selectedItemClassName={selectedItemClassName}
          targetStyle={targetStyle}
          itemStyle={itemStyle}
          chrome={chrome}
          onSelectItem={editable ? selectItem : noop}
          onDeleteItem={editable ? deleteItem : noop}
        />
      ))}
    </>
  );
}
