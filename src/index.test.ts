import { describe, expect, it } from "vitest";
import { DASHBOARD_PACKAGE } from ".";

describe("@stardust-cms/dashboard scaffold", () => {
  it("exposes the package marker", () => {
    expect(DASHBOARD_PACKAGE).toBe("@stardust-cms/dashboard");
  });
});
