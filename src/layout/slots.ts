/**
 * DASH-T-0014 — the slot-resolution mechanism + the default slot renderers.
 *
 * `resolveSlot(name, override, contract)` is the pattern EVERY region primitive
 * (DASH-T-0015…0018) uses to merge a consumer's `Partial<ShellSlots>` override
 * with the shipped default, handing the renderer only the documented typed
 * contract object (REQ-009) — never internal props or DOM. The default renderers
 * live here (one concern per file) so `layout/ShellRoot.tsx` stays under the
 * size limit and every default is independently importable/tree-shakeable.
 *
 * PURE MODULE — no hooks, no side effects. Each renderer is a function of its
 * contract only; the OWNER of a region (e.g. the top-bar region, DASH-T-0018)
 * reads `useCommands`/`useExtensions` and BUILDS the contract, keeping the
 * subscription out of `Shell.Root` (NFR-006). Visuals arrive via DASH-I-0004
 * (`sd-*` classes); the class names here are placeholders those rules target.
 *
 * BOUNDARY: imports only React + `./layoutTypes` siblings.
 */

import { createElement } from "react";
import type { ReactNode } from "react";
import { SD_FOOTER, SD_TOPBAR } from "./layoutTypes.js";
import type {
  ActionAreaContract,
  ContentWrapperContract,
  EmptySlotContract,
  LoadingSlotContract,
  ShellSlots,
  TopbarContract,
} from "./layoutTypes.js";

/** `empty` default: surfaces the documented `reason` the area is empty. */
export function defaultEmpty(contract: EmptySlotContract): ReactNode {
  return createElement("div", { className: "sd-empty", role: "note" }, contract.reason);
}

/** `loading` default: an `aria-live` status while the connection is not ready. */
export function defaultLoading(contract: LoadingSlotContract): ReactNode {
  return createElement(
    "div",
    { className: "sd-loading", role: "status", "aria-live": "polite" },
    contract.message ?? "Loading…",
  );
}

/**
 * `account` default: a STUB of the reserved `currentUser` seam (no current-user
 * controller exists this round). Renders a labelled, empty slot a future
 * `useCurrentUser` fills additively — so the contract is honoured without
 * fabricating user chrome.
 */
export function defaultAccount(): ReactNode {
  return createElement("div", { className: "sd-account", "aria-label": "Account" });
}

/** `action-area` default: a toolbar of command buttons + rendered tool handles. */
export function defaultActionArea(contract: ActionAreaContract): ReactNode {
  const commandButtons = contract.commands.map((command) =>
    createElement(
      "button",
      { key: command.id, type: "button", onClick: () => { command.run(); } },
      command.title,
    ),
  );
  const tools = contract.tools.map((tool) =>
    createElement("span", { key: tool.id }, tool.render()),
  );
  return createElement(
    "div",
    { className: "sd-action-area", role: "toolbar" },
    [...commandButtons, ...tools],
  );
}

/** `topbar` default: the banner landmark composing account + action-area. */
export function defaultTopbar(contract: TopbarContract): ReactNode {
  return createElement("div", { className: SD_TOPBAR, role: "banner" }, [
    createElement("div", { key: "account" }, defaultAccount()),
    createElement("div", { key: "actions" }, defaultActionArea(contract.actionArea)),
  ]);
}

/** `footer` stub: the `contentinfo` landmark (content lands in DASH-T-0018). */
export function defaultFooter(): ReactNode {
  return createElement("div", { className: SD_FOOTER, role: "contentinfo" });
}

/** `content-wrapper` default: passes the wrapped canvas children through. */
export function defaultContentWrapper(contract: ContentWrapperContract): ReactNode {
  return contract.children;
}

/**
 * The full default slot table. Slots whose real content lands in later tasks
 * (`sidebar`, `page-header`, `modal-content`) default to nothing so a region can
 * render before its sibling content is final; a consumer override replaces any
 * one without touching the rest.
 */
export const defaultSlots: ShellSlots = {
  topbar: defaultTopbar,
  sidebar: () => null,
  "page-header": () => null,
  "content-wrapper": defaultContentWrapper,
  "modal-content": () => null,
  empty: defaultEmpty,
  loading: defaultLoading,
  account: defaultAccount,
  "action-area": defaultActionArea,
};

/**
 * Resolve a named slot (REQ-009): return the consumer override's output when a
 * `Partial<ShellSlots>` entry exists, else the shipped default's — passing the
 * documented typed `contract` object either way. The picked renderer's type is
 * exactly `ShellSlots[K]`, so no assertion is needed to invoke it.
 */
export function resolveSlot<K extends keyof ShellSlots>(
  name: K,
  override: Partial<ShellSlots> | undefined,
  contract: Parameters<ShellSlots[K]>[0],
): ReactNode {
  // Localized correlated-generic bridge (mirrors admin/extensionRegistry): TS
  // cannot correlate the generic key `K` with the per-key renderer signature
  // when indexing, so the picked renderer widens to the union of all nine
  // signatures. We narrow it back to this key's concrete signature — the ONE
  // unavoidable assertion; `name`/`override`/`contract` stay precise at every
  // call site, so a mismatched contract is still a compile error there.
  const renderer = (override?.[name] ?? defaultSlots[name]) as (
    contract: Parameters<ShellSlots[K]>[0],
  ) => ReactNode;
  return renderer(contract);
}
