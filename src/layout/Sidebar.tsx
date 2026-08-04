/**
 * DASH-T-0015/0016 — `Shell.Sidebar`, the composable sidebar region.
 *
 * Hosts the DASH-I-0003 sidebar content via the `sidebar` slot (default = the
 * bundled panels, stubbed until DASH-I-0003 lands) and ENCAPSULATES responsive
 * collapse (REQ-003, NFR-004): it reflects `useSidebarState()` (`open`/
 * `collapsed`) and `useLayoutState().breakpoint`, and below the drawer
 * breakpoint (`mobile`) collapses to a drawer toggled by a keyboard-operable
 * trigger (a native `<button>`, so Enter/Space work for free — NFR-003). Above
 * it, the panel is always present and `collapsed` drives a rail (via
 * `data-collapsed`, styled in DASH-I-0004).
 *
 * Reads ONLY the sidebar + layout slices (narrow subscription, NFR-006) — never
 * modal/overlay. Emits `sd-sidebar` + the `complementary` landmark.
 *
 * BOUNDARY: React + the `admin` public barrel + `./layout` siblings.
 */

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutState, useSidebarState } from "../admin";
import { joinClasses } from "./classNames.js";
import { resolveSlot } from "./slots.js";
import { SD_SIDEBAR } from "./layoutTypes.js";
import type { RegionProps, ShellSlots } from "./layoutTypes.js";

/** The breakpoint at/below which the sidebar becomes a toggleable drawer. */
const DRAWER_BREAKPOINT = "mobile";

/** Props for {@link Sidebar}: region props + the `sidebar` slot override. */
export interface SidebarProps extends RegionProps {
  /** Consumer override for the `sidebar` slot (default = bundled panels). */
  readonly slots?: Partial<ShellSlots>;
}

export function Sidebar({
  className,
  style,
  children,
  slots,
}: SidebarProps): ReactNode {
  // Read the whole slice: `toggle`/`setActiveTab` are interface METHODS, so they
  // must be called via the object (destructuring them trips `unbound-method`).
  const sidebar = useSidebarState();
  const { open, collapsed, activeTab } = sidebar;
  const { breakpoint } = useLayoutState();
  const drawer = breakpoint === DRAWER_BREAKPOINT;
  const panelId = useId();
  // In drawer mode the panel is shown only when `open`; otherwise it is always
  // present (its width/rail state is `collapsed`, styled in DASH-I-0004).
  const showPanel = !drawer || open;
  const rootStyle: CSSProperties | undefined = style;

  return (
    <aside
      className={joinClasses(SD_SIDEBAR, className)}
      aria-label="Sidebar"
      data-breakpoint={breakpoint}
      data-drawer={drawer ? "" : undefined}
      data-open={open ? "" : undefined}
      data-collapsed={collapsed ? "" : undefined}
      {...(rootStyle ? { style: rootStyle } : {})}
    >
      {drawer && (
        <button
          type="button"
          className="sd-sidebar__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            sidebar.toggle();
          }}
        >
          {open ? "Close menu" : "Open menu"}
        </button>
      )}
      {showPanel && (
        <div id={panelId} className="sd-sidebar__panel">
          {resolveSlot("sidebar", slots, {
            activeTab,
            setActiveTab: (tab) => {
              sidebar.setActiveTab(tab);
            },
          })}
          {children}
        </div>
      )}
    </aside>
  );
}
