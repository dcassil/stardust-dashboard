/**
 * The demo's `BlockType[]` registry (SIFR-I-0007 REQ-004, Use Case 1).
 *
 * The shell package ships NO built-in block types; the consumer supplies them.
 * This is the reference example's registry — `text` and `image` — the same two
 * kinds the original SIFR demo hard-coded, now expressed through the public
 * registry seam. Each block supplies:
 *
 *  - `defaultValue()` — seeds a freshly-inserted block (drives the shell's
 *    `onInsert` default merge), and
 *  - `renderField(content, onEdit)` — the side-panel editor whose `onEdit(patch)`
 *    the {@link SidePanel} forwards verbatim into a store `edit` op.
 *
 * A third-party integrator adds their own (`heading`, `gallery`, …) here without
 * touching the shell (Use Case 2).
 */

import type { ChangeEvent, ReactNode } from "react";
import type { BlockType } from "@stardust-cms/dashboard";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";

function TextField(
  content: CmsContent,
  onEdit: (patch: { value?: string }) => void,
): ReactNode {
  const onChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    onEdit({ value: e.target.value });
  };
  return (
    <label className="panel__field">
      <span>Text</span>
      <textarea
        rows={4}
        value={content.value ?? ""}
        onChange={onChange}
        data-testid="panel-text"
      />
    </label>
  );
}

function ImageField(
  content: CmsContent,
  onEdit: (patch: { value?: string }) => void,
): ReactNode {
  const onChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onEdit({ value: e.target.value });
  };
  return (
    <label className="panel__field">
      <span>Image source (URL / data URI)</span>
      <input
        type="text"
        value={content.value ?? ""}
        onChange={onChange}
        data-testid="panel-image"
      />
    </label>
  );
}

export const BLOCK_TYPES: readonly BlockType[] = [
  {
    type: "text",
    label: "Text",
    defaultValue: () => "New text block",
    renderField: TextField,
  },
  {
    type: "image",
    label: "Image",
    defaultValue: () =>
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" rx="12" fill="#e2e8f0"/><text x="160" y="88" font-family="sans-serif" font-size="18" fill="#64748b" text-anchor="middle">New image</text></svg>',
      ),
    renderField: ImageField,
  },
];
