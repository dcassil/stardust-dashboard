/**
 * DASH-T-0025 — `ContentOverlay.Actions`, the named action slot (REQ-003).
 *
 * `.Actions` positions its children as the item's action cluster — top-right of
 * the item, within the geometry-positioned region established by the compound
 * root (DASH-T-0023), so the slot itself does NO geometry math (NFR-004). Its
 * children are arbitrary: the default action set (DASH-T-0026) OR consumer
 * controls.
 *
 * ## Slot contract (stable, documented)
 *
 * Children reach the item they act on through the compound context, NOT through
 * props this slot injects (NFR-002): a child calls {@link useContentOverlayContext}
 * to read `« target, child, ref: EditingRef »`, and the frozen DASH-I-0001
 * editing hooks (`useEditingActions`/`useSelection`/`useEditingState`) for state
 * and action handles. A custom `<button>` dropped into `.Actions` therefore
 * reaches exactly the same capabilities as the bundled `<EditButton>`/
 * `<RemoveButton>` — the canonical zero-fork composition (Use Case 1):
 *
 * ```tsx
 * <ContentOverlay.Actions>
 *   <EditButton onClick={() => openMyModal(target)} />
 * </ContentOverlay.Actions>
 * ```
 */

import type { CSSProperties, ReactNode } from "react";
import { SD_ACTIONS } from "./overlaysTypes.js";

/** Merge a base class with an optional consumer class. */
function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

export interface ContentOverlayActionsProps {
  /** Extra class on the cluster (in addition to {@link SD_ACTIONS}). */
  className?: string;
  /** Extra style, merged after the top-right positioning. */
  style?: CSSProperties;
  /** Accessible name for the toolbar cluster. @default "Item actions" */
  "aria-label"?: string;
  /** The action controls — default set (DASH-T-0026) or consumer controls. */
  children?: ReactNode;
}

/**
 * The positioned action cluster. A `toolbar` landmark so the controls inside are
 * announced as a group and are keyboard-navigable (a11y). Absolutely positioned
 * at the top-right of the item region provided by {@link ContentOverlay}.
 */
export function ContentOverlayActions({
  className,
  style,
  "aria-label": ariaLabel = "Item actions",
  children,
}: ContentOverlayActionsProps): ReactNode {
  return (
    <div
      className={joinClasses(SD_ACTIONS, className)}
      role="toolbar"
      aria-label={ariaLabel}
      style={{ position: "absolute", top: 4, right: 4, ...(style ?? {}) }}
    >
      {children}
    </div>
  );
}
