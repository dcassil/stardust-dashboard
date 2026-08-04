/**
 * DASH-T-0013 — layout contract type-level tests.
 *
 * TC-001 (slot contracts are typed objects; a `Partial<ShellSlots>` composes)
 * and TC-002 (the `SD_*` class constants are stable string literals).
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import {
  SD_MODAL_HOST,
  SD_SHELL_ROOT,
  type AdminShellProps,
  type LayoutRegionName,
  type ModalContentContract,
  type ShellSlots,
} from "./layoutTypes.js";

describe("DASH-T-0013 — slot contracts are typed objects (TC-001)", () => {
  it("a Partial<ShellSlots> with a typed modal-content renderer composes", () => {
    const slots: Partial<ShellSlots> = {
      "modal-content": (c: ModalContentContract) => {
        // contract is a typed object: id/payload/close — never DOM/props.
        return c.id;
      },
      empty: (c) => c.reason,
    };
    const props: AdminShellProps = { slots };
    expect(typeof props.slots?.["modal-content"]).toBe("function");
    expectTypeOf<ShellSlots["modal-content"]>().parameter(0).toEqualTypeOf<ModalContentContract>();
  });

  it("LayoutRegionName includes the region set", () => {
    expectTypeOf<"main-content">().toExtend<LayoutRegionName>();
    expectTypeOf<"modal-host">().toExtend<LayoutRegionName>();
  });
});

describe("DASH-T-0013 — sd-* constants are stable literals (TC-002)", () => {
  it("exposes single-source class-hook constants", () => {
    expect(SD_SHELL_ROOT).toBe("sd-shell-root");
    expect(SD_MODAL_HOST).toBe("sd-modal-host");
    expectTypeOf(SD_SHELL_ROOT).toEqualTypeOf<"sd-shell-root">();
  });
});
