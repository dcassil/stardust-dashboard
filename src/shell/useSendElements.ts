/**
 * Host-side `cms/sendElements` sender (ported from the SIFR demo).
 *
 * `useStardustHost` owns the frame-link connection but is deliberately a
 * read/overlay hook — it exposes no element sender. The dashboard shell needs to
 * PUSH content into the iframe, so it binds `frame-link-react`'s generic
 * `useSend` to the `cms/sendElements` channel through a local registry adapter
 * (mirroring the adapter's internal `registry.ts`: the protocol's `request`
 * field maps to frame-link's `payload`).
 *
 * This lives in the shell (not the published `@stardust-cms/iframe-adapter`
 * host entry) because pushing content is a host-app concern; the library keeps
 * its host hook edit-store-agnostic. Ported verbatim from
 * `demo/admin/src/useSendElements.ts` so behavior is byte-for-behavior equal.
 */

import { useSend } from "frame-link-react";
import type {
  ContentPayload,
  RequestOf,
  ResponseOf,
  StardustMessageKey,
} from "@stardust-cms/iframe-adapter/protocol";

/** frame-link registry view of the Stardust protocol (payload ← request). */
type StardustFrameLinkRegistry = {
  [K in StardustMessageKey]: {
    payload: RequestOf<K>;
    response: ResponseOf<K>;
  };
};

/** Returns a sender that pushes one {@link ContentPayload} via `cms/sendElements`. */
export function useSendElements(): (payload: ContentPayload) => Promise<void> {
  return useSend<StardustFrameLinkRegistry, "cms/sendElements">(
    "cms/sendElements",
  );
}
