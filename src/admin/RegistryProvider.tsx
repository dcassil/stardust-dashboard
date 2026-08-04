/**
 * `RegistryProvider` (DASH-T-0008) — instantiates the command + extension
 * registries once (stable for the tree's lifetime via `useState` lazy init, so
 * no ref is read during render) and publishes them via their contexts. Mounted
 * by `AdminProvider` (DASH-T-0009); usable standalone in tests.
 */

import { useState, type ReactNode } from "react";
import { CommandRegistryContext, createCommandRegistry } from "./commandRegistry.js";
import {
  ExtensionRegistryContext,
  createExtensionRegistry,
} from "./extensionRegistry.js";

export function RegistryProvider({
  children,
}: {
  children?: ReactNode;
}): ReactNode {
  const [commandRegistry] = useState(createCommandRegistry);
  const [extensionRegistry] = useState(createExtensionRegistry);
  return (
    <CommandRegistryContext.Provider value={commandRegistry}>
      <ExtensionRegistryContext.Provider value={extensionRegistry}>
        {children}
      </ExtensionRegistryContext.Provider>
    </CommandRegistryContext.Provider>
  );
}
