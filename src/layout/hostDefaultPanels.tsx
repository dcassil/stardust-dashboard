/**
 * DASH-T-0038 — the default host sidebar panel composition.
 *
 * Post-DASH-T-0020 the turnkey `AdminShell` sidebar is config-free: it
 * auto-renders registered `panels` extensions (`useExtensions("panels")`) rather
 * than hard-wiring block-type config. So `HostShell` supplies its bundled sidebar
 * by REGISTERING this composition as a `panels` extension (see `HostShell.tsx`),
 * threading its `blockTypes`/`editable` — restoring the "Use Case 2" default
 * sidebar (a block palette + the selection content panel) that the 0.2 region
 * refactor deferred, WITHOUT `AdminShell` gaining any block-type config.
 *
 * It composes the DASH-I-0003 panels: a `<Palette>` in a `<SidePanel.Section>`
 * plus `<SidePanel.Content>` (which defaults its selection from `useSelection()`).
 * BOUNDARY: layout may import the `blocks` public barrel.
 */

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useRegisterExtension } from "../admin";
import { Palette, SidePanel } from "../blocks";
import type { BlockTypeRegistry } from "../blocks";

export interface HostDefaultPanelsProps {
  /** The host's block-type registry (from `HostShellProps.blockTypes`). */
  blockTypes: BlockTypeRegistry;
  /** Read-only mode disables palette drag (from `HostShellProps.editable`). */
  editable: boolean;
}

/** The bundled default sidebar: a block palette + the selection content panel. */
export function HostDefaultPanels({
  blockTypes,
  editable,
}: HostDefaultPanelsProps): ReactNode {
  return (
    <SidePanel blockTypes={blockTypes}>
      <SidePanel.Section title="Blocks">
        <Palette blockTypes={blockTypes} editable={editable} />
      </SidePanel.Section>
      <SidePanel.Content blockTypes={blockTypes} />
    </SidePanel>
  );
}

/**
 * Register {@link HostDefaultPanels} as a `panels` extension so the turnkey
 * `AdminShell` sidebar auto-renders it (DASH-T-0038). Memoized so the
 * registration effect runs once per `blockTypes`/`editable` change; a custom
 * `renderLayout` simply doesn't mount the `AdminShell` that reads it.
 */
export function useRegisterDefaultPanels(
  blockTypes: BlockTypeRegistry,
  editable: boolean,
): void {
  const contribution = useMemo(
    () => ({
      id: "sd-host-default-panels",
      render: (): ReactNode => (
        <HostDefaultPanels blockTypes={blockTypes} editable={editable} />
      ),
    }),
    [blockTypes, editable],
  );
  useRegisterExtension("panels", contribution);
}
