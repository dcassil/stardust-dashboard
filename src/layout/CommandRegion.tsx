/**
 * DASH-T-0018 — `Shell.CommandRegion`, the command/tool surface (stub content).
 *
 * Emits `sd-command-region` and renders the registered `useExtensions("tools")`
 * handles inline (no command-palette UI this round — that lands later). It also
 * READS the `useCommands()` seam now (the future palette's source): the read
 * wires the subscription and is surfaced as `data-command-count` so the seam is
 * observable/testable without building palette chrome yet. Narrow subscriptions
 * only (tools + commands — NFR-006); individually mountable (REQ-002).
 *
 * BOUNDARY: React + the `admin` public barrel + `./layout` siblings.
 */

import type { CSSProperties, ReactNode } from "react";
import { useCommands, useExtensions } from "../admin";
import { joinClasses } from "./classNames.js";
import { SD_COMMAND_REGION } from "./layoutTypes.js";
import type { RegionProps } from "./layoutTypes.js";

/** Props for {@link CommandRegion}: base region props (`className`/`style`/children). */
export type CommandRegionProps = RegionProps;

export function CommandRegion({
  className,
  style,
  children,
}: CommandRegionProps): ReactNode {
  const tools = useExtensions("tools");
  // Palette seam (REQ-011): read now so the subscription is wired; no palette UI
  // this round. Surfaced as a data hook so the read is observable/testable.
  const commands = useCommands();
  const rootStyle: CSSProperties | undefined = style;
  return (
    <div
      className={joinClasses(SD_COMMAND_REGION, className)}
      data-command-count={commands.length}
      {...(rootStyle ? { style: rootStyle } : {})}
    >
      {tools.map((tool) => (
        <span key={tool.id}>{tool.render()}</span>
      ))}
      {children}
    </div>
  );
}
