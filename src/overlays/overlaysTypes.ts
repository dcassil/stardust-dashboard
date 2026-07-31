/**
 * Public class-name defaults and prop/render types for {@link Overlays}
 * (SIFR-T-0035). Extracted from `Overlays.tsx` so the component module stays
 * under the size limit; the `overlays/index.ts` barrel re-exports every symbol
 * here, keeping the package's public API byte-for-byte unchanged.
 */

import type { CSSProperties, ReactNode } from "react";
import type { MappedChild, MappedTarget, OperationCallbacks } from "@stardust-cms/iframe-adapter/host";

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
