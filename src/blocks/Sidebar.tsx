import type { ReactNode } from "react";
import { useSidebarState } from "../admin";
import { joinClasses, renderRegionChildren } from "./sidebarContext.js";
import type {
  SidebarBodyProps, SidebarButtonProps, SidebarNavigationProps,
  SidebarRegionProps, SidebarRootProps, SidebarTabContentProps,
  SidebarTabsProps,
} from "./sidebarContext.js";
export type {
  SidebarBodyProps, SidebarButtonProps, SidebarNavigationChildren,
  SidebarNavigationContract, SidebarNavigationProps, SidebarRegionChildren,
  SidebarRegionContract, SidebarRegionProps, SidebarRootProps, SidebarTab,
  SidebarTabContentProps, SidebarTabsProps,
} from "./sidebarContext.js";

function SidebarRoot({
  className,
  style,
  "aria-label": ariaLabel = "Sidebar",
  children,
}: SidebarRootProps): ReactNode {
  const { open, collapsed } = useSidebarState();
  return (
    <aside
      className={joinClasses(
        "sd-sidebar",
        open ? "sd-sidebar--open" : undefined,
        collapsed ? "sd-sidebar--collapsed" : undefined,
        className,
      )}
      aria-label={ariaLabel}
      data-open={open}
      data-collapsed={collapsed}
      {...(style ? { style } : {})}
    >
      {children}
    </aside>
  );
}

function SidebarHeader(props: SidebarRegionProps): ReactNode {
  const { className, style, children } = props;
  return (
    <header
      className={joinClasses("sd-sidebar__header", className)}
      {...(style ? { style } : {})}
    >
      {renderRegionChildren(children)}
    </header>
  );
}

function SidebarBody({ className, style, children }: SidebarBodyProps): ReactNode {
  return (
    <div
      className={joinClasses("sd-sidebar__body", className)}
      {...(style ? { style } : {})}
    >
      {children}
    </div>
  );
}

function SidebarFooter(props: SidebarRegionProps): ReactNode {
  const { className, style, children } = props;
  return (
    <footer
      className={joinClasses("sd-sidebar__footer", className)}
      {...(style ? { style } : {})}
    >
      {renderRegionChildren(children)}
    </footer>
  );
}

function SidebarNavigation({
  className,
  style,
  "aria-label": ariaLabel = "Sidebar navigation",
  children,
}: SidebarNavigationProps): ReactNode {
  // Call methods via the state object (never destructure a method — trips
  // @typescript-eslint/unbound-method); wrap setActiveTab so the slot contract
  // hands children a bound callback.
  const sidebar = useSidebarState();
  const content =
    typeof children === "function"
      ? children({
          activeTab: sidebar.activeTab,
          setActiveTab: (tab) => {
            sidebar.setActiveTab(tab);
          },
        })
      : children;
  return (
    <nav
      className={joinClasses("sd-sidebar__nav", className)}
      role="navigation"
      aria-label={ariaLabel}
      {...(style ? { style } : {})}
    >
      {content}
    </nav>
  );
}

function SidebarTabs({
  className,
  style,
  tabs,
  "aria-label": ariaLabel = "Sidebar tabs",
}: SidebarTabsProps): ReactNode {
  const sidebar = useSidebarState();
  return (
    <div
      className={joinClasses("sd-sidebar__tabs", className)}
      role="tablist"
      aria-label={ariaLabel}
      {...(style ? { style } : {})}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className="sd-sidebar__tab"
          type="button"
          role="tab"
          aria-selected={sidebar.activeTab === tab.id}
          onClick={() => {
            sidebar.setActiveTab(tab.id);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SidebarTabContent(props: SidebarTabContentProps): ReactNode {
  const { className, style, tab, children } = props;
  const { activeTab } = useSidebarState();
  if (activeTab !== tab) {
    return null;
  }
  return (
    <div
      className={joinClasses("sd-sidebar__tab-content", className)}
      role="tabpanel"
      {...(style ? { style } : {})}
    >
      {children}
    </div>
  );
}

function SidebarTrigger(props: SidebarButtonProps): ReactNode {
  const { className, style, "aria-label": ariaLabel = "Toggle sidebar" } = props;
  const { children = "Toggle sidebar" } = props;
  const sidebar = useSidebarState();
  return (
    <button
      className={joinClasses("sd-sidebar__trigger", className)}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={sidebar.open}
      onClick={() => {
        sidebar.toggle();
      }}
      {...(style ? { style } : {})}
    >
      {children}
    </button>
  );
}

function SidebarCollapse(props: SidebarButtonProps): ReactNode {
  const { className, style, "aria-label": ariaLabel = "Collapse sidebar" } = props;
  const { children = "Collapse sidebar" } = props;
  const sidebar = useSidebarState();
  return (
    <button
      className={joinClasses("sd-sidebar__collapse", className)}
      type="button"
      aria-label={ariaLabel}
      aria-pressed={sidebar.collapsed}
      onClick={() => {
        sidebar.collapse(!sidebar.collapsed);
      }}
      {...(style ? { style } : {})}
    >
      {children}
    </button>
  );
}

export const Sidebar = Object.assign(SidebarRoot, {
  Root: SidebarRoot, Header: SidebarHeader, Body: SidebarBody,
  Navigation: SidebarNavigation, Tabs: SidebarTabs,
  TabContent: SidebarTabContent, Footer: SidebarFooter,
  Trigger: SidebarTrigger, Collapse: SidebarCollapse,
});
