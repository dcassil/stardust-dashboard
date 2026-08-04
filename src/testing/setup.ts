/**
 * DASH-T-0022 — global Vitest setup.
 *
 * Registers `jest-axe`'s `toHaveNoViolations` matcher on Vitest's `expect`, so
 * the structure-layer a11y suite can assert an axe-clean assembled shell. The
 * matcher works against `jest-axe`'s own `axe()` (jsdom-backed): rules that
 * require real layout/paint (e.g. `color-contrast`) are inert under jsdom and
 * simply do not run — the landmark / role / name rules the shell cares about do.
 */

import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// `@types/jest-axe` augments jest's matchers, not Vitest's — teach Vitest's
// `expect` about the matcher so `toHaveNoViolations()` type-checks in the suite.
declare module "vitest" {
  interface Assertion {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
