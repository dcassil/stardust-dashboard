/**
 * DASH-T-0018 — `Shell.CommandRegion` tests (TC-001).
 *
 * Registers a `tools` extension + a command, then asserts the region renders the
 * tool handle and surfaces the `useCommands()` seam as `data-command-count`
 * (no palette UI this round). Mounted with only `AdminProvider` (REQ-002).
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import type { ContentSnapshot, ContentStoreAdapter } from "../store";
import { AdminProvider, useRegisterCommand, useRegisterExtension } from "../admin";
import { CommandRegion } from "./CommandRegion.js";
import { SD_COMMAND_REGION } from "./layoutTypes.js";

afterEach(cleanup);

const fakeStore: ContentStoreAdapter = {
  getSnapshot: (): ContentSnapshot => [],
  apply: (): ContentSnapshot => [],
};

function Register(): ReactNode {
  useRegisterCommand({ id: "open", title: "Open", run: () => undefined });
  useRegisterExtension("tools", {
    id: "grid",
    render: () => <b data-testid="tool-grid" />,
  });
  return null;
}

describe("DASH-T-0018 — CommandRegion tool render + command seam (TC-001)", () => {
  it("renders registered tools and exposes the command-count seam", () => {
    const { container } = render(
      <AdminProvider store={fakeStore}>
        <Register />
        <CommandRegion />
      </AdminProvider>,
    );
    const region = container.querySelector<HTMLElement>(`.${SD_COMMAND_REGION}`);
    expect(region).not.toBeNull();
    expect(container.querySelector('[data-testid="tool-grid"]')).not.toBeNull();
    // The `useCommands()` seam is read and surfaced (one command registered).
    expect(region?.getAttribute("data-command-count")).toBe("1");
  });

  it("merges consumer className/style and renders children", () => {
    const { container } = render(
      <AdminProvider store={fakeStore}>
        <CommandRegion className="extra" style={{ minHeight: 12 }}>
          <span data-testid="command-child" />
        </CommandRegion>
      </AdminProvider>,
    );
    const region = container.querySelector<HTMLElement>(`.${SD_COMMAND_REGION}`);
    expect(region).not.toBeNull();
    expect(region?.classList.contains("extra")).toBe(true);
    expect(region?.style.minHeight).toBe("12px");
    expect(region?.getAttribute("data-command-count")).toBe("0");
    expect(container.querySelector('[data-testid="command-child"]')).not.toBeNull();
  });
});
