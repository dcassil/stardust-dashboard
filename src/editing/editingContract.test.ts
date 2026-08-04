/**
 * DASH-T-0002 — editing contract type-level tests.
 *
 * Compile-time assertions (validated by the `typecheck` gate + `expectTypeOf`)
 * that the frozen editing action inputs/outputs stay structurally aligned with
 * the EXISTING store op union — no hand-copied field lists, no drift. Runtime
 * bodies are trivial; the value is in the types being exercised.
 *
 * TC-001 (op input types align with the store union) and TC-002 (EditingRef
 * normalization contract) from the task map onto the checks below.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { InsertOp, MoveOp } from "@stardust-cms/iframe-adapter/host";
import type { ContentSnapshot, DeleteOp, EditOp } from "../store";
import type {
  EditingActions,
  EditingRef,
  SelectionState,
} from "./editingTypes.js";

describe("DASH-T-0002 — editing action inputs derive from the store op union (TC-001)", () => {
  it("add/remove/move/change accept the existing op shapes and return a snapshot", () => {
    expectTypeOf<Parameters<EditingActions["add"]>[0]>().toEqualTypeOf<InsertOp>();
    expectTypeOf<Parameters<EditingActions["remove"]>[0]>().toEqualTypeOf<DeleteOp>();
    expectTypeOf<Parameters<EditingActions["move"]>[0]>().toEqualTypeOf<MoveOp>();
    expectTypeOf<Parameters<EditingActions["change"]>[0]>().toEqualTypeOf<EditOp>();
    expectTypeOf<ReturnType<EditingActions["add"]>>().toEqualTypeOf<ContentSnapshot>();
    expectTypeOf<ReturnType<EditingActions["change"]>>().toEqualTypeOf<ContentSnapshot>();
  });
});

describe("DASH-T-0002 — EditingRef normalization contract (TC-002)", () => {
  it("a null contentId addresses a whole target; selectedRef accepts null", () => {
    const wholeTarget: EditingRef = { targetId: "t1", contentId: null };
    const item: EditingRef = { targetId: "t1", contentId: "c1" };
    expectTypeOf(wholeTarget).toExtend<EditingRef>();
    expectTypeOf(item).toExtend<EditingRef>();
    expectTypeOf<SelectionState["selectedRef"]>().toEqualTypeOf<EditingRef | null>();
  });
});
