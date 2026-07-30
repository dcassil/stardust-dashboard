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
 * INVARIANT (NFR-001): imports ONLY the published host primitives/types, React,
 * and the in-package store seam. No concrete store, no `versioned-content-engine`.
 */

import type { CSSProperties, ReactNode } from "react";
import {
  TargetAreaOverlay,
  ContentItemOverlay,
} from "@stardust-cms/iframe-adapter/host";
import type {
  MappedChild,
  MappedTarget,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import { useContentStore } from "../store/StoreProvider.js";

/* -------------------------------------------------------------------------- */
/* Default class names (the demo's `ov-*` family, styled by tokens.css)       */
/* -------------------------------------------------------------------------- */

/** Default class for each mapped `TargetAreaOverlay` drop area. */
export const DEFAULT_TARGET_CLASS_NAME = "ov-target";
/** Default class added to a selected target (no item selected within it). */
export const DEFAULT_SELECTED_TARGET_CLASS_NAME = "ov-target--selected";
/** Default class added to a container target (nests other targets). */
export const DEFAULT_CONTAINER_TARGET_CLASS_NAME = "ov-target--container";
/** Default class for the target's inner item hit-box (the drag source). */
export const DEFAULT_TARGET_ITEM_CLASS_NAME = "ov-item-hit";
/** Default class for each selectable `ContentItemOverlay` box. */
export const DEFAULT_ITEM_CLASS_NAME = "ov-item";
/** Default class added to the selected `ContentItemOverlay`. */
export const DEFAULT_SELECTED_ITEM_CLASS_NAME = "ov-item--selected";
/** Default class for the per-target chrome group wrapper. */
export const DEFAULT_GROUP_CLASS_NAME = "ov-group";
/** Default class for the built-in delete button. */
export const DEFAULT_DELETE_CLASS_NAME = "ov-delete";

/* -------------------------------------------------------------------------- */
/* Item chrome render-prop                                                    */
/* -------------------------------------------------------------------------- */

/** Actions handed to a custom {@link OverlaysProps.renderItemChrome}. */
export interface ItemChromeActions {
  /** Dispatch a store {@link DeleteOp} for this item (target + content id). */
  onDelete: () => void;
}

/**
 * Render the chrome for a single content item (delete/duplicate/handle …),
 * given the mapped child and the store-wired actions. Return `null` to render no
 * chrome for an item.
 */
export type RenderItemChrome = (
  child: MappedChild,
  targetId: string,
  actions: ItemChromeActions,
) => ReactNode;

/* -------------------------------------------------------------------------- */
/* Default delete-button chrome                                               */
/* -------------------------------------------------------------------------- */

interface DeleteButtonProps {
  child: MappedChild;
  onDelete: () => void;
  className: string;
}

/**
 * The default per-item chrome: a small delete affordance positioned at the
 * item's top-right, ported from the demo's `DeleteButton`. Dispatches through
 * the store via the injected `onDelete` action (so the store `DeleteOp` path is
 * preserved even when a consumer keeps the default).
 */
function DeleteButton({
  child,
  onDelete,
  className,
}: DeleteButtonProps): ReactNode {
  const { geometry } = child;
  return (
    <button
      type="button"
      className={className}
      title="Delete block"
      style={{
        top: geometry.top + 4,
        left: geometry.left + geometry.width - 26,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
    >
      ×
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlays                                                                    */
/* -------------------------------------------------------------------------- */

export interface OverlaysProps {
  /**
   * Targets mapped into host coordinates — from `useStardustHost().targets`.
   * The shell owns the single host connection and passes them down.
   */
  targets: MappedTarget[];
  /**
   * The edit-intent callbacks bundled by `useStardustHost` — spread onto the
   * `TargetAreaOverlay`s so drag/drop still emits insert/move ops through the
   * host. Selection is handled here (through the store) but any `onSelect` in
   * `callbacks` is still honored for the target hit-box.
   */
  callbacks: OperationCallbacks;

  /** The currently selected content id (drives the item `selected` class). */
  selectedContentId?: string | null;
  /** The currently selected target id (drives the target `selected` class). */
  selectedTargetId?: string | null;

  /** Override the per-target group wrapper class. */
  groupClassName?: string;
  /** Override the target drop-area class. */
  targetClassName?: string;
  /** Override the selected-target class. */
  selectedTargetClassName?: string;
  /** Override the container-target class. */
  containerTargetClassName?: string;
  /** Override the target inner item hit-box class. */
  targetItemClassName?: string;
  /** Override the content-item box class. */
  itemClassName?: string;
  /** Override the selected content-item class. */
  selectedItemClassName?: string;
  /** Override the default delete-button class. */
  deleteClassName?: string;
  /** Extra style merged onto each target box. */
  targetStyle?: CSSProperties;
  /** Extra style merged onto each content-item box. */
  itemStyle?: CSSProperties;

  /**
   * Replace the per-item chrome. Default: a delete button that dispatches a
   * store {@link DeleteOp}. A custom render still receives `onDelete`, so a
   * consumer's control can route delete through the store without forking.
   */
  renderItemChrome?: RenderItemChrome;
  /**
   * When no `renderItemChrome` is provided, whether to render the default
   * delete button. Set `false` to render selectable items with no chrome.
   * @default true
   */
  showDeleteButton?: boolean;
}

/**
 * The default per-item chrome factory: the bundled delete button, store-wired.
 * Extracted so it is the single fallback both when `renderItemChrome` is omitted
 * and (implicitly) the documented default a consumer overrides.
 */
function defaultRenderItemChrome(
  deleteClassName: string,
): RenderItemChrome {
  return (child, _targetId, actions): ReactNode => (
    <DeleteButton
      child={child}
      onDelete={actions.onDelete}
      className={deleteClassName}
    />
  );
}

export function Overlays({
  targets,
  callbacks,
  selectedContentId = null,
  selectedTargetId = null,
  groupClassName = DEFAULT_GROUP_CLASS_NAME,
  targetClassName = DEFAULT_TARGET_CLASS_NAME,
  selectedTargetClassName = DEFAULT_SELECTED_TARGET_CLASS_NAME,
  containerTargetClassName = DEFAULT_CONTAINER_TARGET_CLASS_NAME,
  targetItemClassName = DEFAULT_TARGET_ITEM_CLASS_NAME,
  itemClassName = DEFAULT_ITEM_CLASS_NAME,
  selectedItemClassName = DEFAULT_SELECTED_ITEM_CLASS_NAME,
  deleteClassName = DEFAULT_DELETE_CLASS_NAME,
  targetStyle,
  itemStyle,
  renderItemChrome,
  showDeleteButton = true,
}: OverlaysProps): ReactNode {
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

  const resolvedChrome: RenderItemChrome | null = renderItemChrome
    ? renderItemChrome
    : showDeleteButton
      ? defaultRenderItemChrome(deleteClassName)
      : null;

  return (
    <>
      {targets.map((target: MappedTarget) => {
        const targetSelected =
          selectedTargetId === target.targetId && selectedContentId === null;
        const targetClasses = [
          targetClassName,
          targetSelected ? selectedTargetClassName : "",
          target.isContainer ? containerTargetClassName : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={target.targetId} className={groupClassName}>
            <TargetAreaOverlay
              target={target}
              {...callbacks}
              className={targetClasses}
              itemClassName={targetItemClassName}
              {...(targetStyle ? { style: targetStyle } : {})}
            />
            {target.children.map((child) => {
              const isSelected = child.contentId === selectedContentId;
              const itemClasses = [
                itemClassName,
                isSelected ? selectedItemClassName : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={`chrome-${child.contentId}`}>
                  <ContentItemOverlay
                    targetId={target.targetId}
                    child={child}
                    index={child.index}
                    onSelect={selectItem}
                    className={itemClasses}
                    {...(itemStyle ? { style: itemStyle } : {})}
                  />
                  {resolvedChrome?.(child, target.targetId, {
                    onDelete: () => deleteItem(target.targetId, child.contentId),
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
