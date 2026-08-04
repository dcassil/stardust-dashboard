/**
 * DASH-T-0006 — admin behavior contract type-level tests.
 *
 * Compile-time assertions (validated by the `typecheck` gate + `expectTypeOf`)
 * that the reserved extension kinds are type-separable from the implemented ones
 * (enabling the runtime guard in DASH-T-0008) and that `OverlayState.mode` is an
 * open union that still offers literal autocomplete.
 *
 * TC-001 (reserved kinds distinguishable) and TC-002 (open-union mode) map onto
 * the checks below.
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  AnyExtensionKind,
  ExtensionContribution,
  ExtensionKind,
  OverlayState,
  PanelContribution,
  ReservedContribution,
} from "./adminTypes.js";

describe("DASH-T-0006 — reserved vs implemented extension kinds (TC-001)", () => {
  it("reserved kinds are in AnyExtensionKind but not ExtensionKind", () => {
    expectTypeOf<"navigation">().toExtend<AnyExtensionKind>();
    expectTypeOf<"navigation">().not.toExtend<ExtensionKind>();
    expectTypeOf<"panels">().toExtend<ExtensionKind>();
    expectTypeOf<"panels">().toExtend<AnyExtensionKind>();
  });

  it("ExtensionContribution resolves per kind (impl kinds vs reserved brand)", () => {
    expectTypeOf<ExtensionContribution<"panels">>().toEqualTypeOf<PanelContribution>();
    expectTypeOf<ExtensionContribution<"navigation">>().toEqualTypeOf<ReservedContribution>();
  });
});

describe("DASH-T-0006 — OverlayState.mode open union (TC-002)", () => {
  it("accepts the built-in literals and any string (open union)", () => {
    expectTypeOf<"edit">().toExtend<OverlayState["mode"]>();
    expectTypeOf<"preview">().toExtend<OverlayState["mode"]>();
    expectTypeOf<string>().toExtend<OverlayState["mode"]>();
  });
});
