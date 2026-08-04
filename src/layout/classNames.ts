/**
 * DASH-T-0015 — the shared class-name joiner for the layout region primitives.
 * Merges an `sd-*` hook (+ any legacy positioning class) with the consumer's
 * `className`, dropping empties. Pure, tree-shakeable.
 */

/** Join truthy class-name parts with a single space. */
export function joinClasses(...parts: readonly (string | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}
