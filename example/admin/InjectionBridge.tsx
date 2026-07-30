/**
 * `InjectionBridge` — re-inject the store snapshot into the iframe on EVERY
 * snapshot change, including edits/deletes that don't flow through the shell's
 * host-callback path.
 *
 * `HostShell` injects `store.getSnapshot()` on connect and after overlay
 * drag/drop insert/move ops (which route through `useStardustHost`'s callbacks).
 * But side-panel field EDITS and overlay DELETES are dispatched through
 * `useContentStore().apply` directly, which updates the shared snapshot without
 * going through the shell's re-injection. This consumer-side bridge closes that
 * loop the officially-supported way: it subscribes to the public
 * `useContentStore().snapshot` and pushes changed payloads through the same
 * `cms/sendElements` channel the shell uses (`frame-link-react`'s `useSend`).
 *
 * It also blanks trailing slots that a delete/move vacated (the iframe merge
 * never removes an item; sending an empty payload at the orphaned slot clears
 * it) — mirroring the shell's own `useSendElements` blanking logic so a deleted
 * item visibly disappears from the preview.
 *
 * Rendered as a child of `HostShell`, so it sits inside both `FrameLinkProvider`
 * (transport for `useSend`) and `StoreProvider` (the snapshot source).
 */

import { useEffect, useRef } from "react";
import { useSend } from "frame-link-react";
import {
  useContentStore,
  type ContentSnapshot,
} from "@stardust-cms/dashboard";
import type {
  ContentPayload,
  RequestOf,
  ResponseOf,
  StardustMessageKey,
} from "@stardust-cms/iframe-adapter/protocol";

type StardustFrameLinkRegistry = {
  [K in StardustMessageKey]: {
    payload: RequestOf<K>;
    response: ResponseOf<K>;
  };
};

function maxIndexByTarget(snapshot: ContentSnapshot): Map<string, number> {
  const max = new Map<string, number>();
  for (const p of snapshot) {
    max.set(p.targetId, Math.max(max.get(p.targetId) ?? -1, p.index));
  }
  return max;
}

function blankPayload(targetId: string, index: number): ContentPayload {
  return {
    targetId,
    contentId: `__blank-${targetId}-${index}`,
    index,
    content: { id: `__blank-${targetId}-${index}`, type: "text", value: "" },
  };
}

export function InjectionBridge(): null {
  const { snapshot } = useContentStore();
  const send = useSend<StardustFrameLinkRegistry, "cms/sendElements">(
    "cms/sendElements",
  );
  const prevMaxRef = useRef<Map<string, number>>(new Map());
  // Skip the first snapshot: HostShell already injects the full snapshot on
  // connect, so re-sending it here would be redundant. We only push CHANGES.
  const firstRef = useRef(true);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      prevMaxRef.current = maxIndexByTarget(snapshot);
      return;
    }
    for (const payload of snapshot) {
      void send(payload).catch(() => {
        /* not connected / peer gone */
      });
    }
    const nextMax = maxIndexByTarget(snapshot);
    for (const [targetId, prevMax] of prevMaxRef.current) {
      const currentMax = nextMax.get(targetId) ?? -1;
      for (let i = currentMax + 1; i <= prevMax; i += 1) {
        void send(blankPayload(targetId, i)).catch(() => {
          /* ignore */
        });
      }
    }
    prevMaxRef.current = nextMax;
  }, [snapshot, send]);

  return null;
}
