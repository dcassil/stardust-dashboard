/**
 * DASH-T-0037 — `PresenceIndicator` tests.
 *
 * TC-001 proves the slot is a no-op without source data, renders fabricated
 * consumer presence data when supplied, exposes accessible collaborator names,
 * and keeps the compact row free of axe violations.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it } from "vitest";
import { PresenceIndicator } from "./PresenceIndicator.js";
import type { PresenceSource } from "./PresenceIndicator.js";

afterEach(cleanup);

const collaborators: PresenceSource = [
  { id: "u1", name: "Ada Lovelace", color: "rebeccapurple" },
  {
    id: "u2",
    name: "Grace Hopper",
    color: "teal",
    selectedContentId: "content-2",
  },
];

describe("DASH-T-0037 — PresenceIndicator", () => {
  it("renders nothing when source is absent", () => {
    const { container } = render(<PresenceIndicator />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when source is empty", () => {
    const { container } = render(<PresenceIndicator source={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders named collaborators and merges the container class", () => {
    render(<PresenceIndicator source={collaborators} className="mine" />);

    const list = screen.getByRole("list", { name: "Active collaborators" });
    expect(list.classList.contains("sd-presence")).toBe(true);
    expect(list.classList.contains("mine")).toBe(true);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByLabelText("Ada Lovelace")).toBeDefined();
    expect(screen.getByLabelText("Grace Hopper")).toBeDefined();
  });

  it("has no axe violations for rendered presences", async () => {
    const { container } = render(<PresenceIndicator source={collaborators} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
