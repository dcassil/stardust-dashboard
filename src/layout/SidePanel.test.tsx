/**
 * DASH-T-0016 — `Shell.SidePanel` tests.
 *
 * A pure structural region: it renders its `children` (the DASH-I-0003 panels)
 * inside a labelled `complementary` landmark with the `sd-side-panel` hook, and
 * mounts anywhere without a provider (REQ-002 — it subscribes to no controller).
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SidePanel } from "./SidePanel.js";
import { SD_SIDE_PANEL } from "./layoutTypes.js";

afterEach(cleanup);

describe("DASH-T-0016 — SidePanel hosts panels in a complementary landmark", () => {
  it("renders children inside a labelled complementary aside with the sd hook", () => {
    // No provider needed — proves individual mountability (REQ-002).
    const { container, getByTestId } = render(
      <SidePanel className="extra">
        <div data-testid="panel">edit panel</div>
      </SidePanel>,
    );
    const aside = container.querySelector(`aside.${SD_SIDE_PANEL}`);
    expect(aside).not.toBeNull();
    expect(aside?.getAttribute("aria-label")).toBe("Side panel");
    // consumer className merged alongside the sd-* hook.
    expect(aside?.classList.contains("extra")).toBe(true);
    expect(getByTestId("panel")).not.toBeNull();
  });

  it("applies consumer style when provided", () => {
    const { container } = render(<SidePanel style={{ width: 280 }} />);
    const aside = container.querySelector<HTMLElement>(`.${SD_SIDE_PANEL}`);
    expect(aside).not.toBeNull();
    expect(aside?.style.width).toBe("280px");
  });
});
