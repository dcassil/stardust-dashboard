/**
 * Registry-driven block palette (SIFR-T-0034, REQ-004).
 *
 * The reusable generalization of the demo's `Palette` (which hard-coded `text`
 * and `image` entries). This component renders one draggable source per
 * {@link BlockType} in the injected `blockTypes` registry, using `label` for
 * display and `type` for the drag payload. On drag start it sets the published
 * `DATA_TRANSFER_KEYS.type` key so a drop on a `TargetAreaOverlay` is resolved by
 * the library's `opFromDataTransfer` into an `InsertOp` for a new block of that
 * type. No literal `text`/`image` entries remain — the demo supplies those via
 * its own registry.
 */

import type { DragEvent, ReactNode } from "react";
import { DATA_TRANSFER_KEYS } from "@stardust-cms/iframe-adapter/host";
import type { BlockType, BlockTypeRegistry } from "./BlockType.js";

export interface PaletteProps {
  /** The block-type registry to render. An empty registry renders no entries. */
  blockTypes: BlockTypeRegistry;
}

/**
 * The draggable block palette. Iterates `blockTypes` 1:1 (TC-001) and advertises
 * each block's `type` on drag; the library owns the drop → op translation.
 */
export function Palette({ blockTypes }: PaletteProps): ReactNode {
  const handleDragStart =
    (block: BlockType) =>
    (event: DragEvent<HTMLDivElement>): void => {
      event.dataTransfer.setData(DATA_TRANSFER_KEYS.type, block.type);
      event.dataTransfer.effectAllowed = "copy";
    };

  return (
    <section className="panel">
      <h2 className="panel__title">Blocks</h2>
      <p className="panel__hint">
        Drag a block onto any target (including a container column).
      </p>
      <div className="palette">
        {blockTypes.map((block) => (
          <div
            key={block.type}
            className="palette__item"
            draggable
            onDragStart={handleDragStart(block)}
            data-block-type={block.type}
            data-testid={`palette-item-${block.type}`}
          >
            <span className="palette__type">{block.type}</span>
            {block.label}
          </div>
        ))}
      </div>
    </section>
  );
}
