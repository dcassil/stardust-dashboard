/**
 * DASH-T-0016 — `Shell.SidePanel`, the composable side-panel region.
 *
 * Hosts the DASH-I-0003 placement-agnostic panels (an `EditPanel`/`StylePanel`)
 * as `children`; the region owns only placement + landmark, not the panel
 * content (initiative Non-Goal). Emits `sd-side-panel` + a labelled
 * `complementary` landmark (distinct from `Shell.Sidebar`'s, so two
 * complementary regions stay disambiguated — NFR-003). Pure structure: it holds
 * no state and subscribes to no controller (NFR-006), so it is individually
 * mountable anywhere (REQ-002).
 *
 * BOUNDARY: React + `./layout` siblings only.
 */

import type { CSSProperties, ReactNode } from "react";
import { joinClasses } from "./classNames.js";
import { SD_SIDE_PANEL } from "./layoutTypes.js";
import type { RegionProps } from "./layoutTypes.js";

/** Props for {@link SidePanel}: base region props (`className`/`style`/children). */
export type SidePanelProps = RegionProps;

export function SidePanel({
  className,
  style,
  children,
}: SidePanelProps): ReactNode {
  const rootStyle: CSSProperties | undefined = style;
  return (
    <aside
      className={joinClasses(SD_SIDE_PANEL, className)}
      aria-label="Side panel"
      {...(rootStyle ? { style: rootStyle } : {})}
    >
      {children}
    </aside>
  );
}
