/**
 * `@stardust-cms/dashboard` shell barrel — the scaled-canvas MECHANICS surface.
 *
 * Since DASH-T-0020 the shell layer owns only the canvas engine + its markup: the
 * `HostShell` composition (and its `hostShellTypes`/`HostSelectionContext`/
 * `ConnectionStatus`/`defaultSlots` cluster) moved to `layout/` when `HostShell`
 * became a thin wrapper over the `AdminShell` region substrate — that removed the
 * `shell ↔ layout` import cycle (the `layout` regions read `useCanvas` from here,
 * so `HostShell` mounting `AdminShell` from within `shell` would have closed a
 * cycle). This barrel now exposes the {@link CanvasProvider}/{@link useCanvas}
 * engine + {@link ScaledCanvas} markup that the `layout` structure layer composes
 * (via the legal `layout → shell` edge) to build `Shell.IframeArea`/
 * `Shell.MainContent` without re-deriving geometry or opening a second
 * store-injection path.
 */

export { CanvasProvider, useCanvas } from "./canvasEngine.js";
export type { CanvasConfig, CanvasEngineState } from "./canvasEngine.js";
export { ScaledCanvas } from "./ScaledCanvas.js";
export type { ScaledCanvasProps } from "./ScaledCanvas.js";
