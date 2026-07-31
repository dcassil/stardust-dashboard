/**
 * `TargetGroup` — renders one mapped target's drop area plus its content-item
 * overlays and per-item chrome. Extracted from `Overlays.tsx` so that component
 * stays under the size/complexity limits. Not part of the public API — an
 * internal presentational sub-part of {@link Overlays}.
 */

import type { CSSProperties, ReactNode } from "react";
import {
  TargetAreaOverlay,
  ContentItemOverlay,
} from "@stardust-cms/iframe-adapter/host";
import type {
  MappedTarget,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import type { RenderItemChrome } from "./overlaysTypes.js";

export interface TargetGroupProps {
  target: MappedTarget;
  callbacks: OperationCallbacks;
  selectedContentId: string | null;
  selectedTargetId: string | null;
  groupClassName: string;
  targetClassName: string;
  selectedTargetClassName: string;
  containerTargetClassName: string;
  targetItemClassName: string;
  itemClassName: string;
  selectedItemClassName: string;
  targetStyle: CSSProperties | undefined;
  itemStyle: CSSProperties | undefined;
  chrome: RenderItemChrome | null;
  onSelectItem: (targetId: string, contentId?: string) => void;
  onDeleteItem: (targetId: string, contentId: string) => void;
}

/** Merge a base class with an optional modifier when `on` is true. */
function classes(base: string, modifier: string, on: boolean): string {
  return on ? `${base} ${modifier}` : base;
}

export function TargetGroup(props: TargetGroupProps): ReactNode {
  const {
    target,
    callbacks,
    selectedContentId,
    selectedTargetId,
    groupClassName,
    targetClassName,
    selectedTargetClassName,
    containerTargetClassName,
    targetItemClassName,
    itemClassName,
    selectedItemClassName,
    targetStyle,
    itemStyle,
    chrome,
    onSelectItem,
    onDeleteItem,
  } = props;

  const targetSelected =
    selectedTargetId === target.targetId && selectedContentId === null;
  const containerClass = target.isContainer
    ? ` ${containerTargetClassName}`
    : "";
  const targetClasses =
    classes(targetClassName, selectedTargetClassName, targetSelected) +
    containerClass;

  return (
    <div className={groupClassName}>
      <TargetAreaOverlay
        target={target}
        {...callbacks}
        className={targetClasses}
        itemClassName={targetItemClassName}
        {...(targetStyle ? { style: targetStyle } : {})}
      />
      {target.children.map((child) => (
        <div key={`chrome-${child.contentId}`}>
          <ContentItemOverlay
            targetId={target.targetId}
            child={child}
            index={child.index}
            onSelect={onSelectItem}
            className={classes(
              itemClassName,
              selectedItemClassName,
              child.contentId === selectedContentId,
            )}
            {...(itemStyle ? { style: itemStyle } : {})}
          />
          {chrome?.(child, target.targetId, {
            onDelete: () => {
              onDeleteItem(target.targetId, child.contentId);
            },
          })}
        </div>
      ))}
    </div>
  );
}
