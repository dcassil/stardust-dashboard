/**
 * DASH-T-0034 — the composable content side panel.
 *
 * `SidePanel` is now a COMPOUND: `<SidePanel.Section title>` wraps arbitrary
 * children as a titled section, and `<SidePanel.Content>` is the selection-aware
 * content view that DEFAULTS its selection from `useSelection()` while still
 * accepting explicit `selectedTargetId`/`selectedContentId`/`snapshot` overrides
 * (props win). It is placement-agnostic (a `Sidebar.Body`, a `ModalHost`, or a
 * bare div).
 *
 * BACK-COMPAT: the bundled `SidePanel(props)` keeps its original behavior —
 * given explicit selection props it renders the store-routed content view
 * (`SidePanelContent`), so the frozen `SidePanel.test.tsx` (mounted under
 * `StoreProvider` ONLY, asserting synchronous store ops) passes unchanged. The
 * key is the `undefined`-vs-provided distinction: selection props that are
 * OMITTED (`undefined`) opt into the `useSelection()` default (which needs an
 * `AdminProvider`); selection props that are PROVIDED — even `null` — use the
 * controlled, provider-free store path. See `sidePanelContent.tsx` for why the
 * bundled panel stays store-routed rather than delegating to the controller.
 */

import type { CSSProperties, ReactNode } from "react";
import { useSelection } from "../editing";
import type { ContentSnapshot } from "../store";
import type { BlockTypeRegistry } from "./BlockType.js";
import { SD_PANEL_SECTION } from "./panelTypes.js";
import { SidePanelContent } from "./sidePanelContent.js";

/** Merge a base class with an optional consumer class. */
function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

export interface SidePanelProps {
  /** The block-type registry used to resolve the selected item's field editor. */
  blockTypes: BlockTypeRegistry;
  /** The snapshot to resolve the selection against. Defaults to the live snapshot. */
  snapshot?: ContentSnapshot;
  /**
   * The selected target id. OMIT (undefined) to default from `useSelection()`;
   * pass a value or `null` to control it (provider-free store path). Optional
   * since DASH-T-0034 (was required) — additive/back-compatible.
   */
  selectedTargetId?: string | null;
  /** The selected content id. Same omit-to-default semantics as `selectedTargetId`. */
  selectedContentId?: string | null;
  /** Compound children (Sections). When present, `SidePanel` is a container. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface SidePanelSectionProps {
  /** The section heading. */
  title: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface SidePanelContentViewProps {
  blockTypes: BlockTypeRegistry;
  snapshot?: ContentSnapshot;
  selectedTargetId?: string | null;
  selectedContentId?: string | null;
  className?: string;
  style?: CSSProperties;
}

/** A titled section wrapping arbitrary children; composes in any order. */
function SidePanelSection({
  title,
  children,
  className,
  style,
}: SidePanelSectionProps): ReactNode {
  return (
    <section
      className={joinClasses(`${SD_PANEL_SECTION} panel`, className)}
      {...(style ? { style } : {})}
    >
      <h3 className="panel__title">{title}</h3>
      {children}
    </section>
  );
}

/**
 * The selection-aware content view: defaults selection from `useSelection()`,
 * props override. Split so `useSelection()` (which needs an `AdminProvider`) is
 * called ONLY on the auto path — the controlled path stays provider-free.
 */
function SidePanelContentView(props: SidePanelContentViewProps): ReactNode {
  const providedSelection =
    props.selectedTargetId !== undefined ||
    props.selectedContentId !== undefined;
  if (providedSelection) {
    return (
      <SidePanelContent
        blockTypes={props.blockTypes}
        selectedTargetId={props.selectedTargetId ?? null}
        selectedContentId={props.selectedContentId ?? null}
        {...(props.snapshot ? { snapshot: props.snapshot } : {})}
        {...(props.className ? { className: props.className } : {})}
        {...(props.style ? { style: props.style } : {})}
      />
    );
  }
  return <SidePanelAutoContent {...props} />;
}

/** The `useSelection()`-defaulting content view (needs an `AdminProvider`). */
function SidePanelAutoContent(props: SidePanelContentViewProps): ReactNode {
  const { selectedTargetId, selectedContentId } = useSelection();
  return (
    <SidePanelContent
      blockTypes={props.blockTypes}
      selectedTargetId={selectedTargetId}
      selectedContentId={selectedContentId}
      {...(props.snapshot ? { snapshot: props.snapshot } : {})}
      {...(props.className ? { className: props.className } : {})}
      {...(props.style ? { style: props.style } : {})}
    />
  );
}

/**
 * The compound side panel. With `children` it is a container; otherwise it is the
 * selection-content view (controlled when selection props are provided, else
 * defaulting from `useSelection()`).
 */
function SidePanelRoot(props: SidePanelProps): ReactNode {
  if (props.children !== undefined) {
    return (
      <div
        className={joinClasses("sd-side-panel", props.className)}
        {...(props.style ? { style: props.style } : {})}
      >
        {props.children}
      </div>
    );
  }
  return (
    <SidePanelContentView
      blockTypes={props.blockTypes}
      {...(props.snapshot ? { snapshot: props.snapshot } : {})}
      {...(props.selectedTargetId !== undefined
        ? { selectedTargetId: props.selectedTargetId }
        : {})}
      {...(props.selectedContentId !== undefined
        ? { selectedContentId: props.selectedContentId }
        : {})}
      {...(props.className ? { className: props.className } : {})}
      {...(props.style ? { style: props.style } : {})}
    />
  );
}

export const SidePanel = Object.assign(SidePanelRoot, {
  Section: SidePanelSection,
  // `.Content` honors explicit selection props (props win), else defaults from
  // `useSelection()` — the same dispatch the bare `SidePanel` uses.
  Content: SidePanelContentView,
});
