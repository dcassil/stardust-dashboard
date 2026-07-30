/**
 * Reference-example admin app (SIFR-T-0036 / SIFR-I-0007 REQ-008, Use Case 1).
 *
 * This is the initiative's proof artifact: the demo/admin re-based onto the
 * `@stardust-cms/dashboard` boilerplate, backed by the Versioned Content Engine
 * through `createVersionedContentStoreAdapter`. There is NO bespoke
 * `HostCanvas`/`config.ts`/store-bridge composition anymore — the whole editor is
 * `<HostShell store={vceAdapter} blockTypes={BLOCK_TYPES} ... />` plus the
 * bundled `Overlays`, `Palette`, and `SidePanel`, styled by the shell's `tokens`.
 *
 * ## Demo controls the VCE adapter enables
 *
 * The engine's draft/live/publish/history surface as three controls, wired to the
 * adapter's optional capability methods:
 *
 *  - **Draft / Live toggle** — flips the injected view between `getDraft()` and
 *    `getLive()`. Draft edits are invisible in Live until published.
 *  - **Publish** — `adapter.publish()`, advancing live to the current draft.
 *  - **Previous-version selector** — `adapter.materializeVersion(v)`, injecting an
 *    older version READ-ONLY (the historical-fidelity proof: a pre-delete version
 *    still shows the deleted item).
 *
 * ## How a view change re-injects
 *
 * `HostShell` owns iframe injection and injects `store.getSnapshot()` on connect
 * and after each op. To preview a different view (live / historical) without
 * modifying the shell, the app hands `HostShell` a thin **presentation adapter**
 * whose `getSnapshot()` returns the currently-selected view, and remounts the
 * shell (via a changing `key`) whenever the selected view changes — so the shell
 * re-runs its connect-time full injection against the new view. In `draft` mode
 * the presentation adapter is fully live-editable (ops pass straight through); in
 * `live`/`history` mode it is read-only (ops are ignored) so a past version can
 * be inspected without mutating it.
 *
 * ## Selection
 *
 * The shell threads selection to its overlay chrome but not to `children`, and we
 * may not modify the shell. So the app captures selection itself: every overlay
 * click dispatches a `select` op through the store, and the presentation
 * adapter's `apply` forwards those select ops to an `onSelect` callback the app
 * owns. The app renders `Palette` + `SidePanel` inside `renderLayout` (which runs
 * inside the shell's `StoreProvider`, so `SidePanel` can read the live snapshot)
 * and passes the captured selection to `SidePanel`.
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  HostShell,
  Palette,
  SidePanel,
  type HostShellLayoutParts,
} from "@stardust-cms/dashboard";
import "@stardust-cms/dashboard/tokens";
import { BLOCK_TYPES } from "./blockTypes.js";
import { InjectionBridge } from "./InjectionBridge.js";
import { createSeededAdapter } from "./seed.js";
import {
  makePresentationAdapter,
  type Selection,
  type ViewMode,
} from "./presentationAdapter.js";
import { SITE_ORIGIN, SITE_URL, DESIGN_WIDTH, DESIGN_HEIGHT } from "./config.js";

export function App(): ReactNode {
  // Build the seeded adapter ONCE (StrictMode is off, so this runs once).
  const seededRef = useRef(createSeededAdapter());
  const base = seededRef.current.adapter;

  const [mode, setMode] = useState<ViewMode>("draft");
  const [versions, setVersions] = useState<string[]>([
    seededRef.current.seededVersion,
  ]);
  const [historyVersion, setHistoryVersion] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({
    targetId: null,
    contentId: null,
  });
  // Bumping this key remounts HostShell so it re-injects the newly-selected view.
  const [injectKey, setInjectKey] = useState(0);

  const reinject = useCallback(() => {
    setSelection({ targetId: null, contentId: null });
    setInjectKey((k) => k + 1);
  }, []);

  const presentationAdapter = useMemo(
    () => makePresentationAdapter(base, mode, historyVersion, setSelection),
    [base, mode, historyVersion],
  );

  const onToggleMode = useCallback(
    (next: ViewMode) => {
      setMode(next);
      if (next !== "history") setHistoryVersion(null);
      reinject();
    },
    [reinject],
  );

  const onPublish = useCallback(() => {
    base.publish?.();
    const v = base.getLiveVersion();
    setVersions((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setMode("live");
    setHistoryVersion(null);
    reinject();
  }, [base, reinject]);

  const onSelectVersion = useCallback(
    (v: string) => {
      if (v === "") {
        setMode("draft");
        setHistoryVersion(null);
      } else {
        setMode("history");
        setHistoryVersion(v);
      }
      reinject();
    },
    [reinject],
  );

  const readOnly = mode !== "draft";

  const renderLayout = useCallback(
    ({ canvas, status }: HostShellLayoutParts): ReactNode => (
      <div className="admin-layout">
        <div className="admin-main">
          <div className="admin-controls" data-testid="admin-controls">
            <div
              className="admin-controls__group"
              role="group"
              aria-label="View mode"
            >
              <button
                type="button"
                data-testid="mode-draft"
                aria-pressed={mode === "draft"}
                className={mode === "draft" ? "is-active" : ""}
                onClick={() => onToggleMode("draft")}
              >
                Draft
              </button>
              <button
                type="button"
                data-testid="mode-live"
                aria-pressed={mode === "live"}
                className={mode === "live" ? "is-active" : ""}
                onClick={() => onToggleMode("live")}
              >
                Live
              </button>
            </div>

            <button
              type="button"
              data-testid="publish"
              className="admin-controls__publish"
              onClick={onPublish}
            >
              Publish
            </button>

            <label className="admin-controls__versions">
              <span>Inspect version</span>
              <select
                data-testid="version-select"
                value={
                  mode === "history" && historyVersion ? historyVersion : ""
                }
                onChange={(e) => onSelectVersion(e.target.value)}
              >
                <option value="">(current draft)</option>
                {versions.map((v) => (
                  <option key={v} value={v}>
                    version {v}
                  </option>
                ))}
              </select>
            </label>

            <span
              className="admin-controls__mode"
              data-testid="current-mode"
              data-mode={mode}
              data-readonly={readOnly ? "true" : "false"}
            >
              {mode === "draft"
                ? "Editing draft"
                : mode === "live"
                  ? "Previewing live (read-only)"
                  : `Inspecting version ${historyVersion} (read-only)`}
            </span>
          </div>
          {status}
          {canvas}
        </div>

        <aside className="admin-side">
          {/* Palette (drag source) only in editable draft mode; a past version
              or the live preview cannot be mutated. */}
          {!readOnly ? <Palette blockTypes={BLOCK_TYPES} /> : null}
          <SidePanel
            blockTypes={BLOCK_TYPES}
            selectedTargetId={selection.targetId}
            selectedContentId={selection.contentId}
          />
        </aside>
      </div>
    ),
    [
      mode,
      historyVersion,
      versions,
      readOnly,
      selection,
      onToggleMode,
      onPublish,
      onSelectVersion,
    ],
  );

  return (
    <HostShell
      key={injectKey}
      iframeOrigin={SITE_ORIGIN}
      iframeSrc={SITE_URL}
      designWidth={DESIGN_WIDTH}
      designHeight={DESIGN_HEIGHT}
      store={presentationAdapter}
      blockTypes={BLOCK_TYPES}
      renderLayout={renderLayout}
    >
      {/* Re-inject side-panel edits / overlay deletes that don't flow through
          the shell's host-callback path. Sits inside the shell's providers. */}
      <InjectionBridge />
    </HostShell>
  );
}
