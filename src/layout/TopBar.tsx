/**
 * DASH-T-0018 — `Shell.TopBar`, the banner region (REAL primitive, stub content).
 *
 * Emits `sd-topbar` + the `banner` landmark and composes three things:
 *  - the live CONNECTION STATUS (read from the canvas engine, narrow — NFR-006),
 *    rendered as region chrome via the `sd-topbar__status` hook (DASH-I-0004
 *    styles it; no `admin-status` chrome, which belongs to `HostShell`);
 *  - the `account` slot — a STUB of the DASH-I-0001 reserved `currentUser` seam
 *    ({@link AccountContract}); a future `useCurrentUser` fills it additively;
 *  - the `action-area` slot — a toolbar built from the live `useCommands()` +
 *    `useExtensions("tools")` handles ({@link ActionAreaContract}).
 *
 * A consumer may override the WHOLE bar via the `topbar` slot (REQ-009, TC-002)
 * or surgically override just `account` / `action-area`; overriding one leaves
 * the rest intact. The reserved `navigation` kind is READ now via
 * {@link useReservedExtensions} (forward-compat seam): it subscribes but gets
 * nothing and renders nothing until the kind ships — reading a reserved kind is
 * a no-op that never throws (the guard is on registration, not reads).
 *
 * BOUNDARY: React + the `admin` public barrel + the `shell` canvas surface (the
 * legal `layout → shell` edge) + `./layout` siblings.
 */

import type { CSSProperties, ReactNode } from "react";
import { useCommands, useExtensions, useReservedExtensions } from "../admin";
import { useCanvas } from "../shell";
import { joinClasses } from "./classNames.js";
import { resolveSlot } from "./slots.js";
import { SD_TOPBAR } from "./layoutTypes.js";
import type {
  AccountContract,
  ActionAreaContract,
  RegionProps,
  ShellSlots,
} from "./layoutTypes.js";

/** Props for {@link TopBar}: region props + the `topbar`/`account`/`action-area` overrides. */
export interface TopBarProps extends RegionProps {
  /** Consumer overrides for the `topbar`, `account`, and `action-area` slots. */
  readonly slots?: Partial<ShellSlots>;
}

export function TopBar({ className, style, slots }: TopBarProps): ReactNode {
  const { connectionState } = useCanvas();
  const commands = useCommands();
  const tools = useExtensions("tools");
  // Reserved forward-compat seam (REQ-011): reads the not-yet-implemented
  // `navigation` kind — subscribes, gets nothing, renders nothing, never throws.
  const navigation = useReservedExtensions("navigation");

  const account: AccountContract = { currentUser: undefined };
  const actionArea: ActionAreaContract = { commands, tools };
  const rootStyle: CSSProperties | undefined = style;

  // A whole-bar `topbar` override replaces account + action-area together;
  // otherwise the two sub-slots resolve independently (surgical override).
  const body = slots?.topbar
    ? resolveSlot("topbar", slots, { account, actionArea })
    : (
        <>
          {resolveSlot("account", slots, account)}
          {resolveSlot("action-area", slots, actionArea)}
        </>
      );

  return (
    <header
      className={joinClasses(SD_TOPBAR, className)}
      role="banner"
      {...(rootStyle ? { style: rootStyle } : {})}
    >
      <div className="sd-topbar__status" data-state={connectionState} role="status">
        {connectionState}
      </div>
      {navigation.map(() => null)}
      {body}
    </header>
  );
}
