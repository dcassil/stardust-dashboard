/**
 * The default per-item overlay chrome: a small delete button, ported from the
 * SIFR demo's `DeleteButton`. Extracted from `Overlays.tsx` so that module stays
 * under the size limit. Not part of the public API — the overlay barrel exports
 * only the {@link RenderItemChrome} factory result, never this component.
 */

import type { ReactNode } from "react";
import type { MappedChild } from "@stardust-cms/iframe-adapter/host";
import type { RenderItemChrome } from "./overlaysTypes.js";
import { SD_REMOVE_BUTTON } from "./overlaysTypes.js";

interface DeleteButtonProps {
  child: MappedChild;
  onDelete: () => void;
  className: string;
}

/**
 * A small delete affordance positioned at the item's top-right. Dispatches
 * through the store via the injected `onDelete` action (so the store `DeleteOp`
 * path is preserved even when a consumer keeps the default).
 */
function DeleteButton({
  child,
  onDelete,
  className,
}: DeleteButtonProps): ReactNode {
  const { geometry } = child;
  return (
    <button
      type="button"
      // DASH-T-0028: `sd-remove-button` emitted additively next to the legacy
      // `ov-delete` (`className`) so the bundled default delete affordance shares
      // the standalone `<RemoveButton>` theme hook. Behavior/store path unchanged.
      className={`${className} ${SD_REMOVE_BUTTON}`}
      title="Delete block"
      style={{
        top: geometry.top + 4,
        left: geometry.left + geometry.width - 26,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
    >
      ×
    </button>
  );
}

/**
 * The default per-item chrome factory: the bundled delete button, store-wired.
 * The single fallback both when `renderItemChrome` is omitted and the documented
 * default a consumer overrides.
 */
export function defaultRenderItemChrome(
  deleteClassName: string,
): RenderItemChrome {
  return (child, _targetId, actions): ReactNode => (
    <DeleteButton
      child={child}
      onDelete={actions.onDelete}
      className={deleteClassName}
    />
  );
}
