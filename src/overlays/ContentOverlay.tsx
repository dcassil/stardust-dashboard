/**
 * DASH-T-0023 — `<ContentOverlay target>`, the compound-component root of the
 * composable overlay (DASH-I-0002 REQ-001).
 *
 * It renders the target's drop area (wrapping the published, unstyled
 * {@link TargetAreaOverlay}) and, per mapped child, a positioned region that
 * provides {@link ContentOverlayContext}. The sub-parts landing in later tasks
 * (`ContentOverlay.SelectionRing` / `.Actions`, `<EditButton>` …) read that
 * context to position and wire themselves; this task establishes only the
 * pattern + context + geometry-derived positioning.
 *
 * Geometry is consumed AS-IS from the already-host-mapped `geometry` on
 * `MappedTarget`/`MappedChild` (NFR-004): no scale multiplication, no mapping
 * import. Item positioning uses the same absolute-from-geometry idiom as the
 * demo's delete button (`DeleteButton.tsx`).
 */

import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { TargetAreaOverlay } from "@stardust-cms/iframe-adapter/host";
import type {
  MappedChild,
  MappedGeometry,
  MappedTarget,
  OperationCallbacks,
} from "@stardust-cms/iframe-adapter/host";
import type { EditingRef } from "../editing";
import { ContentOverlayContext } from "./contentOverlayContext.js";
import type { ContentOverlayContextValue } from "./contentOverlayContext.js";
import { SD_CONTENT_OVERLAY, SD_CONTENT_OVERLAY_ITEM } from "./overlaysTypes.js";
import { SelectionRing } from "./SelectionRing.js";
import { ContentOverlayActions } from "./Actions.js";

/** Merge a base class with an optional consumer class. */
function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

/**
 * Absolute box straight from mapped geometry — the sub-parts position within it.
 * Reads only the already-mapped `top`/`left`/`width`/`height` (NFR-004).
 */
function positionFromGeometry(geometry: MappedGeometry): CSSProperties {
  return {
    position: "absolute",
    top: geometry.top,
    left: geometry.left,
    width: geometry.width,
    height: geometry.height,
  };
}

export interface ContentOverlayProps {
  /** The mapped target this overlay renders chrome for (from `useStardustHost`). */
  target: MappedTarget;
  /**
   * Optional host edit-intent callbacks, spread onto the {@link TargetAreaOverlay}
   * so drag/drop still emits insert/move/select through the host. The standalone
   * `<InsertZone>`/`<MoveHandle>` primitives (DASH-T-0027) are the composable
   * equivalents; the bundled `Overlays` re-impl (DASH-T-0028) passes these.
   */
  callbacks?: OperationCallbacks;
  /** Extra class on the compound root (in addition to {@link SD_CONTENT_OVERLAY}). */
  className?: string;
  /** Extra style on the compound root. */
  style?: CSSProperties;
  /** Optional class for the wrapped target drop area. */
  targetClassName?: string;
  /**
   * The per-child chrome — rendered once inside each child's context. Typically
   * `<ContentOverlay.SelectionRing/>` + `<ContentOverlay.Actions>` (later tasks);
   * omitted here, the root still establishes the context + positioned regions.
   */
  children?: ReactNode;
}

interface ContentOverlayItemProps {
  target: MappedTarget;
  child: MappedChild;
  children: ReactNode;
}

/**
 * One child's positioned region + its {@link ContentOverlayContext}. Extracted so
 * the context value is memoized per child (referentially stable unless its target
 * or child changes — NFR-006), which a `.map` closure in the parent can't do.
 */
function ContentOverlayItem({
  target,
  child,
  children,
}: ContentOverlayItemProps): ReactNode {
  const value = useMemo<ContentOverlayContextValue>(() => {
    const ref: EditingRef = {
      targetId: target.targetId,
      contentId: child.contentId,
    };
    return { target, child, ref };
  }, [target, child]);

  return (
    <ContentOverlayContext.Provider value={value}>
      <div
        className={SD_CONTENT_OVERLAY_ITEM}
        style={positionFromGeometry(child.geometry)}
      >
        {children}
      </div>
    </ContentOverlayContext.Provider>
  );
}

/**
 * The compound overlay root. Usable standalone given a `target`; its sub-parts
 * fall back to explicit props when rendered outside it. Exported as a compound
 * component with `ContentOverlay.SelectionRing` (DASH-T-0024) and
 * `ContentOverlay.Actions` (DASH-T-0025) attached as static members below.
 */
function ContentOverlayRoot({
  target,
  callbacks,
  className,
  style,
  targetClassName,
  children,
}: ContentOverlayProps): ReactNode {
  return (
    <div
      className={joinClasses(SD_CONTENT_OVERLAY, className)}
      {...(style ? { style } : {})}
    >
      <TargetAreaOverlay
        target={target}
        {...(callbacks ?? {})}
        {...(targetClassName ? { className: targetClassName } : {})}
      />
      {target.children.map((child) => (
        <ContentOverlayItem key={child.contentId} target={target} child={child}>
          {children}
        </ContentOverlayItem>
      ))}
    </div>
  );
}

/**
 * The compound overlay: `<ContentOverlay>` plus its named parts as static
 * members (`<ContentOverlay.SelectionRing/>`, `<ContentOverlay.Actions>`),
 * mirroring the `<Menu>/<Menu.Item>` idiom.
 */
export const ContentOverlay = Object.assign(ContentOverlayRoot, {
  SelectionRing,
  Actions: ContentOverlayActions,
});
