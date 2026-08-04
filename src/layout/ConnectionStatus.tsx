/**
 * `ConnectionStatus` — the bundled connection-status strip (ported from the
 * SIFR demo's `ConnectionStatus.tsx`).
 *
 * Renders the frame-link connection lifecycle in the UI (never console-only):
 * connecting, connected, and error each get a legible label and a colored
 * indicator. `error` covers site-not-reachable / handshake-timeout (the host
 * hook folds the connection error into `connectionState`).
 *
 * This is the DEFAULT `renderStatus` slot content for {@link HostShell}. A
 * consumer that supplies its own `renderStatus` render-prop replaces it wholesale;
 * this component stays exported so consumers can reuse or wrap it. Styling comes
 * from the theme tokens (`@stardust-cms/dashboard/tokens`) via the `admin-status`
 * class family, exactly as the demo used it.
 */

import type { ReactNode } from "react";
import type { ConnectionState } from "@stardust-cms/iframe-adapter/host";

const LABELS: Record<ConnectionState, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting to embedded site…",
  connected: "Connected — editing live",
  error:
    "Connection error — is the embedded site running on the expected origin?",
};

export interface ConnectionStatusProps {
  /** The live frame-link connection lifecycle state. */
  state: ConnectionState;
  /** Current iframe render scale (canvas width / design width). */
  scale: number;
  /** The embedded site origin, shown for operator context. */
  siteOrigin: string;
}

export function ConnectionStatus({
  state,
  scale,
  siteOrigin,
}: ConnectionStatusProps): ReactNode {
  return (
    <header className="admin-status" data-state={state}>
      <span className={`admin-status__dot admin-status__dot--${state}`} />
      <span className="admin-status__label">{LABELS[state]}</span>
      <span className="admin-status__spacer" />
      <span className="admin-status__meta">origin {siteOrigin}</span>
      <span className="admin-status__meta">scale {scale.toFixed(2)}×</span>
    </header>
  );
}
