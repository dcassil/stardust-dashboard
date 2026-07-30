/**
 * Reference-example site root.
 *
 * Wires the iframe-side adapter stack (mirrors SIFR's `demo/site`):
 *
 *  1. `FrameLinkProvider` — owns the frame-link transport; `targetOrigin` is the
 *     ADMIN's explicit origin (never `"*"`, NFR-002).
 *  2. `StardustAdapterProvider` — registers the frame-link target, answers
 *     `cms/requestTargetPositions`, folds `cms/sendElements` into its content
 *     map, and streams geometry/scroll to the host.
 *  3. `SeedContent` — seeds the content map so the page renders standalone.
 *  4. `Page` — the `EditableTarget` layout with a nested container.
 */

import type { ReactNode } from "react";
import { FrameLinkProvider } from "frame-link-react";
import { StardustAdapterProvider } from "@stardust-cms/iframe-adapter";
import { SeedContent } from "./SeedContent.js";
import { Page } from "./Page.js";
import { FRAME_LINK_OPTIONS } from "./config.js";

export function App(): ReactNode {
  return (
    <FrameLinkProvider options={FRAME_LINK_OPTIONS}>
      <StardustAdapterProvider>
        <SeedContent>
          <Page />
        </SeedContent>
      </StardustAdapterProvider>
    </FrameLinkProvider>
  );
}
