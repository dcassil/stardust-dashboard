/**
 * DASH-T-0018 — `Shell.Footer`, the `contentinfo` region (thin stub).
 *
 * Emits `sd-footer` + the `contentinfo` landmark (NFR-003). A REAL region
 * primitive with a deliberately minimal default: it renders its `children` and
 * otherwise ships no content this round — later work (status line, attribution,
 * links) fills it without an API change. Holds no state and subscribes to no
 * controller (NFR-006), so it is individually mountable anywhere (REQ-002).
 *
 * BOUNDARY: React + `./layout` siblings only.
 */

import type { CSSProperties, ReactNode } from "react";
import { joinClasses } from "./classNames.js";
import { SD_FOOTER } from "./layoutTypes.js";
import type { RegionProps } from "./layoutTypes.js";

/** Props for {@link Footer}: base region props (`className`/`style`/children). */
export type FooterProps = RegionProps;

export function Footer({ className, style, children }: FooterProps): ReactNode {
  const rootStyle: CSSProperties | undefined = style;
  return (
    <footer
      className={joinClasses(SD_FOOTER, className)}
      role="contentinfo"
      {...(rootStyle ? { style: rootStyle } : {})}
    >
      {children}
    </footer>
  );
}
