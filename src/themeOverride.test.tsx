/**
 * DASH-T-0046 — override paths (b) + (c), asserted at render time (REQ-005).
 *
 * (b) `sd-*` class targeting — every primitive emits its stable `sd-*` hook, so a
 *     consumer stylesheet can target it. (c) per-instance override — a passed
 *     `className` merges over (does not replace) the default hook, and a passed
 *     inline `style` is applied. The emitted-⇔-styled catalog test proves those
 *     hooks are all styled; this proves they are present + overridable on the DOM.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { EditingProvider } from "./editing";
import type { ContentSnapshot, ContentStoreAdapter } from "./store";
import { PresenceIndicator } from "./blocks/PresenceIndicator.js";
import { FieldEditor } from "./blocks/FieldEditor.js";
import type { BlockType } from "./blocks/BlockType.js";

afterEach(cleanup);

function makeStore(): ContentStoreAdapter {
  const snapshot: ContentSnapshot = [];
  return { getSnapshot: () => snapshot, apply: (): ContentSnapshot => snapshot };
}

function inProvider(ui: ReactNode): HTMLElement {
  return render(<EditingProvider store={makeStore()}>{ui}</EditingProvider>).container;
}

describe("DASH-T-0046 — per-instance className/style override (TC-002 c)", () => {
  it("PresenceIndicator: emits sd-presence AND merges a custom className + style", () => {
    const { container } = render(
      <PresenceIndicator
        source={[{ id: "u1", name: "Ana", color: "#f00" }]}
        className="my-presence"
        style={{ opacity: 0.5 }}
      />,
    );
    const el = container.querySelector<HTMLElement>(".sd-presence");
    expect(el).not.toBeNull();
    expect(el?.classList.contains("my-presence")).toBe(true);
    expect(el?.style.opacity).toBe("0.5");
  });

  it("FieldEditor: emits sd-field-editor AND merges a custom className + style", () => {
    const block: BlockType = { type: "text", label: "Text" };
    const content: CmsContent = { id: "c1", type: "text", value: "hello" };
    const container = inProvider(
      <FieldEditor
        block={block}
        content={content}
        targetId="t1"
        className="my-field"
        style={{ marginTop: "4px" }}
      />,
    );
    const el = container.querySelector<HTMLElement>(".sd-field-editor");
    expect(el).not.toBeNull();
    expect(el?.classList.contains("my-field")).toBe(true);
    expect(el?.style.marginTop).toBe("4px");
  });
});
