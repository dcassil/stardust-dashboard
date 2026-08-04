/**
 * The command registry (DASH-T-0008, REQ-011).
 *
 * A ref-backed registry (a `Map` + a subscriber set + a cached snapshot) so a
 * registration re-renders only the consumers whose slice changed — never a
 * broadcast re-render. `useRegisterCommand` registers for the calling
 * component's lifetime (effect-scoped, unregisters on unmount, balanced under
 * StrictMode double-invoke); `useCommands(ctx)` reads the registered commands
 * with `when(ctx)` evaluated lazily. Registering a duplicate id throws.
 *
 * BOUNDARY: imports only React + admin types; never the store or geometry. The
 * registry instance is created + provided by `AdminProvider` (DASH-T-0009); the
 * `CommandRegistryContext` is consumed here by the hooks.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Command } from "./adminTypes.js";

/** The imperative registry surface (created once, held by `AdminProvider`). */
export interface CommandRegistry {
  /** Register a command; returns its unregister fn. Throws on duplicate id. */
  readonly register: (command: Command) => () => void;
  /** Subscribe to registry changes (for `useSyncExternalStore`). */
  readonly subscribe: (listener: () => void) => () => void;
  /** The current commands as a stable snapshot (identity changes on mutation). */
  readonly getCommands: () => readonly Command[];
}

/** Create a fresh, ref-backed command registry. */
export function createCommandRegistry(): CommandRegistry {
  const commands = new Map<string, Command>();
  const listeners = new Set<() => void>();
  let snapshot: readonly Command[] = [];
  const refresh = (): void => {
    snapshot = Array.from(commands.values());
    for (const listener of listeners) {
      listener();
    }
  };
  return {
    register: (command: Command): (() => void) => {
      if (commands.has(command.id)) {
        throw new Error(`Command "${command.id}" is already registered.`);
      }
      commands.set(command.id, command);
      refresh();
      return () => {
        commands.delete(command.id);
        refresh();
      };
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getCommands: (): readonly Command[] => snapshot,
  };
}

export const CommandRegistryContext = createContext<CommandRegistry | null>(null);

function useCommandRegistry(): CommandRegistry {
  const registry = useContext(CommandRegistryContext);
  if (registry === null) {
    throw new Error(
      "useRegisterCommand/useCommands must be used within an <AdminProvider>.",
    );
  }
  return registry;
}

/**
 * Register a command for the calling component's lifetime (REQ-011). Effect-
 * scoped: registers on mount, unregisters on unmount, re-registers if `command`
 * changes identity. Duplicate id throws from `register`.
 */
export function useRegisterCommand(command: Command): void {
  const registry = useCommandRegistry();
  useEffect(() => registry.register(command), [registry, command]);
}

/**
 * Read the registered commands with `when(ctx)` evaluated (REQ-011). The filtered
 * array is memoized on the registry snapshot + `ctx`, so unrelated re-renders do
 * not change its identity.
 */
export function useCommands(ctx?: unknown): readonly Command[] {
  const registry = useCommandRegistry();
  const commands = useSyncExternalStore(
    registry.subscribe,
    registry.getCommands,
  );
  return useMemo(
    () => commands.filter((command) => command.when === undefined || command.when(ctx)),
    [commands, ctx],
  );
}
