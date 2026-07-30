/**
 * Seeds the {@link StardustAdapterProvider}'s content map on first mount so the
 * demo site renders standalone with no host connected. The seed content flows
 * through the same `applyContent` reducer the host's `cms/sendElements` path
 * uses, so seed and injected content never diverge — when the admin connects and
 * re-injects, its payloads replace the seed items at the same `(targetId, index)`.
 */

import { useContext, useEffect, useRef, type ReactNode } from "react";
import { StardustContentContext } from "@stardust-cms/iframe-adapter";
import { seedPayloads } from "../shared/content-model.js";

export function SeedContent({ children }: { children: ReactNode }): ReactNode {
  const ctx = useContext(StardustContentContext);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!ctx || seededRef.current) return;
    seededRef.current = true;
    for (const payload of seedPayloads()) {
      ctx.applyContent(payload);
    }
  }, [ctx]);

  return <>{children}</>;
}
