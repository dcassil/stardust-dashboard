/**
 * DASH-T-0018 — `Shell.Footer` tests.
 *
 * A pure structural region: it emits the `sd-footer` hook + the `contentinfo`
 * landmark (NFR-003) and renders its `children`. Individually mountable with no
 * providers (REQ-002, NFR-006).
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Footer } from "./Footer.js";
import { SD_FOOTER } from "./layoutTypes.js";

afterEach(cleanup);

describe("DASH-T-0018 — Footer landmark + children", () => {
  it("emits sd-footer + contentinfo and renders children, mounted standalone", () => {
    const { container } = render(
      <Footer>
        <span data-testid="footer-child" />
      </Footer>,
    );
    const footer = container.querySelector<HTMLElement>(`.${SD_FOOTER}`);
    expect(footer).not.toBeNull();
    expect(footer?.getAttribute("role")).toBe("contentinfo");
    expect(container.querySelector('[data-testid="footer-child"]')).not.toBeNull();
  });
});
