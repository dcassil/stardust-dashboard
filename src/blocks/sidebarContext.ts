import type { CSSProperties, ReactNode } from "react";

export function joinClasses(
  ...classes: readonly (string | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export interface SidebarRootProps {
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  children?: ReactNode;
}

export interface SidebarPartProps {
  className?: string;
  style?: CSSProperties;
}

export type SidebarRegionContract = Record<never, never>;
export type SidebarRegionChildren =
  | ReactNode
  | ((contract: SidebarRegionContract) => ReactNode);

export interface SidebarRegionProps extends SidebarPartProps {
  children?: SidebarRegionChildren;
}

export interface SidebarBodyProps extends SidebarPartProps {
  children?: ReactNode;
}

export interface SidebarNavigationContract {
  readonly activeTab: string | null;
  setActiveTab(tab: string | null): void;
}

export type SidebarNavigationChildren =
  | ReactNode
  | ((contract: SidebarNavigationContract) => ReactNode);

export interface SidebarNavigationProps extends SidebarPartProps {
  "aria-label"?: string;
  children?: SidebarNavigationChildren;
}

export interface SidebarTab {
  readonly id: string;
  readonly label: string;
}

export interface SidebarTabsProps extends SidebarPartProps {
  tabs: readonly SidebarTab[];
  "aria-label"?: string;
}

export interface SidebarTabContentProps extends SidebarPartProps {
  tab: string;
  children?: ReactNode;
}

export interface SidebarButtonProps extends SidebarPartProps {
  "aria-label"?: string;
  children?: ReactNode;
}

export function renderRegionChildren(
  children: SidebarRegionChildren,
): ReactNode {
  return typeof children === "function" ? children({}) : children;
}
