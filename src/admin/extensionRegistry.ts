/**
 * The extension registry (DASH-T-0008, REQ-012).
 *
 * Ref-backed and PER-KIND: each kind keeps its own map + cached snapshot, so a
 * `tools` registration changes only the `tools` snapshot identity — a `panels`
 * consumer (whose snapshot identity is unchanged) does not re-render (narrow
 * subscription). Covers the four implemented kinds; the four DESIGNED-FOR-LATER
 * kinds are rejected with a runtime "not implemented this round" error AND
 * flagged at compile time (a reserved kind's {@link ExtensionContribution} is the
 * uninhabitable `ReservedContribution`).
 *
 * TYPED-REGISTRY NOTE: a two-arg `register(kind, contribution)` cannot be made
 * fully assertion-free — TS cannot correlate the runtime `kind` discriminant with
 * the statically-generic contribution type (and `panels`/`tools` are structurally
 * identical, so runtime discrimination is impossible either). The unavoidable
 * bridge is therefore LOCALIZED to `storeByKind` (each branch narrows the union
 * to the branch's known member — never an `any`/`unknown` cast); the public hooks
 * and all reads stay precise and assertion-free.
 *
 * BOUNDARY: imports only React + admin types. The instance is created + provided
 * by `AdminProvider` (DASH-T-0009).
 */

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type {
  AnyExtensionKind,
  ExtensionContribution,
  ExtensionKind,
} from "./adminTypes.js";

type KindMaps = { [K in ExtensionKind]: Map<string, ExtensionContribution<K>> };
type KindSnapshots = { [K in ExtensionKind]: readonly ExtensionContribution<K>[] };

/** Anything the registry may be asked to store — precise per-kind at the hook. */
type RegisterableContribution = ExtensionContribution<AnyExtensionKind> & {
  readonly id: string;
};

/** The imperative registry surface (created once, held by `AdminProvider`). */
export interface ExtensionRegistry {
  readonly register: (
    kind: AnyExtensionKind,
    contribution: RegisterableContribution,
  ) => () => void;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getExtensions: <K extends ExtensionKind>(
    kind: K,
  ) => readonly ExtensionContribution<K>[];
}

/** Create a fresh, per-kind ref-backed extension registry. */
export function createExtensionRegistry(): ExtensionRegistry {
  const maps: KindMaps = {
    commands: new Map(),
    actions: new Map(),
    panels: new Map(),
    tools: new Map(),
  };
  const snapshots: KindSnapshots = { commands: [], actions: [], panels: [], tools: [] };
  const listeners = new Set<() => void>();

  // Rebuild ONLY the changed kind's snapshot (concrete keys — no correlated
  // generic write), then notify. Unchanged kinds keep their snapshot identity,
  // which is what gives per-kind narrow subscription.
  const refresh = (kind: ExtensionKind): void => {
    switch (kind) {
      case "commands":
        snapshots.commands = Array.from(maps.commands.values());
        break;
      case "actions":
        snapshots.actions = Array.from(maps.actions.values());
        break;
      case "panels":
        snapshots.panels = Array.from(maps.panels.values());
        break;
      case "tools":
        snapshots.tools = Array.from(maps.tools.values());
        break;
    }
    for (const listener of listeners) {
      listener();
    }
  };

  // The single localized type bridge (see file header): each branch narrows the
  // union to the member the `kind` guarantees. Never any/unknown.
  const storeByKind = (
    kind: ExtensionKind,
    contribution: RegisterableContribution,
  ): void => {
    switch (kind) {
      case "commands":
        maps.commands.set(contribution.id, contribution as ExtensionContribution<"commands">);
        break;
      case "actions":
        maps.actions.set(contribution.id, contribution as ExtensionContribution<"actions">);
        break;
      case "panels":
        maps.panels.set(contribution.id, contribution as ExtensionContribution<"panels">);
        break;
      case "tools":
        maps.tools.set(contribution.id, contribution as ExtensionContribution<"tools">);
        break;
    }
  };

  return {
    register: (kind, contribution) => {
      if (isReservedKind(kind)) {
        throw new Error(
          `Extension kind "${kind}" is reserved and not implemented this round.`,
        );
      }
      if (maps[kind].has(contribution.id)) {
        throw new Error(
          `Extension "${contribution.id}" is already registered for kind "${kind}".`,
        );
      }
      storeByKind(kind, contribution);
      refresh(kind);
      return () => {
        maps[kind].delete(contribution.id);
        refresh(kind);
      };
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getExtensions: (kind) => snapshots[kind],
  };
}

export const ExtensionRegistryContext = createContext<ExtensionRegistry | null>(null);

function useExtensionRegistry(): ExtensionRegistry {
  const registry = useContext(ExtensionRegistryContext);
  if (registry === null) {
    throw new Error(
      "useRegisterExtension/useExtensions must be used within an <AdminProvider>.",
    );
  }
  return registry;
}

/** Type-guard splitting the reserved kinds from the implemented ones. */
function isReservedKind(
  kind: AnyExtensionKind,
): kind is Exclude<AnyExtensionKind, ExtensionKind> {
  return (
    kind === "navigation" ||
    kind === "permissions" ||
    kind === "currentUser" ||
    kind === "resources"
  );
}

/**
 * Register a typed contribution for `kind` for the calling component's lifetime
 * (REQ-012). A reserved kind throws "not implemented this round" (and is already
 * flagged at compile time via {@link ExtensionContribution} resolving to the
 * uninhabitable `ReservedContribution`). Assertion-free: the precise per-kind
 * contribution is assignable to the registry's `RegisterableContribution`.
 */
export function useRegisterExtension<K extends AnyExtensionKind>(
  kind: K,
  contribution: ExtensionContribution<K> & { readonly id: string },
): void {
  const registry = useExtensionRegistry();
  useEffect(() => registry.register(kind, contribution), [registry, kind, contribution]);
}

/** Read the registered contributions for an implemented `kind` (REQ-012). */
export function useExtensions<K extends ExtensionKind>(
  kind: K,
): readonly ExtensionContribution<K>[] {
  const registry = useExtensionRegistry();
  return useSyncExternalStore(registry.subscribe, () => registry.getExtensions(kind));
}
