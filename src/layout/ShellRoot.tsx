/**
 * DASH-T-0014 — `Shell.Root`, the structural landmark container.
 *
 * `Shell.Root` reads ONLY `useLayoutState()` (narrow subscription, NFR-006): it
 * renders the `sd-shell-root` container, stamps the current `breakpoint` for the
 * DASH-I-0004 responsive rules to key off, and renders only the region children
 * whose `region` is in `visibleRegions` (REQ-001). A child WITHOUT a `region`
 * prop is a structural wrapper and always renders. Region children announce
 * themselves via {@link RegionMarker} (`region={LayoutRegionName}`), which every
 * region primitive (DASH-T-0015…0018) spreads.
 *
 * Because it subscribes to the layout slice alone, a modal/overlay change never
 * re-renders `Shell.Root`; the region primitives that DO care read their own
 * slices. Landmark roles live on the regions themselves — `Shell.Root` is the
 * neutral grouping container (NFR-003).
 *
 * BOUNDARY: imports only React + the `admin` public barrel + `./layoutTypes`.
 */

import { Children, isValidElement } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutState } from "../admin";
import { SD_SHELL_ROOT } from "./layoutTypes.js";
import type { LayoutRegionName, RegionProps } from "./layoutTypes.js";

/** Marker a region child spreads so `Shell.Root` can gate it on visibility. */
export interface RegionMarker {
  readonly region: LayoutRegionName;
}

function joinClasses(...parts: readonly (string | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}

/** Read a child's declared region name, if it carries the {@link RegionMarker}. */
function regionOf(node: ReactNode): string | undefined {
  if (!isValidElement(node)) {
    return undefined;
  }
  const props: unknown = node.props;
  if (typeof props !== "object" || props === null || !("region" in props)) {
    return undefined;
  }
  const region: unknown = (props as { readonly region?: unknown }).region;
  return typeof region === "string" ? region : undefined;
}

/** Keep unmarked (structural) children + region children that are visible. */
function visibleChildren(
  children: ReactNode,
  visibleRegions: ReadonlySet<string>,
): readonly ReactNode[] {
  return Children.toArray(children).filter((child) => {
    const region = regionOf(child);
    return region === undefined || visibleRegions.has(region);
  });
}

/** Props for {@link ShellRoot}: the base region props (`className`/`style`/children). */
export type ShellRootProps = RegionProps;

/**
 * The structural container. Reads `useLayoutState`, filters children by
 * `visibleRegions`, and reflects the current `breakpoint` via `data-breakpoint`
 * (the DASH-I-0004 responsive rules select on it — no inline breakpoint logic).
 */
export function ShellRoot(props: ShellRootProps): ReactNode {
  const { className, style, children } = props;
  const { visibleRegions, breakpoint } = useLayoutState();
  const containerStyle: CSSProperties | undefined = style;
  return (
    <div
      className={joinClasses(SD_SHELL_ROOT, className)}
      data-breakpoint={breakpoint}
      {...(containerStyle ? { style: containerStyle } : {})}
    >
      {visibleChildren(children, visibleRegions)}
    </div>
  );
}
