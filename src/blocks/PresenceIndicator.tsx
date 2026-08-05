/**
 * DASH-T-0037 — `PresenceIndicator`, a placement-agnostic presence slot.
 *
 * This is a pure presentational mount: it does not subscribe to collaborators,
 * own transport, or interpret protocol state. Consumers pass already-adapted
 * presence data, and an absent/empty source renders nothing so the slot can be
 * mounted safely by default.
 */

import type { CSSProperties, ReactNode } from "react";

/** Merge a base class with an optional consumer class. */
function joinClasses(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

function initialFor(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1).toUpperCase() : "?";
}

export interface RemotePresence {
  /** Stable id of the remote participant. */
  id: string;
  /** Display name (used for the accessible name + avatar initial). */
  name: string;
  /** Optional CSS color for the participant's dot/avatar. */
  color?: string;
  /** Optional: the content id this participant currently has selected. */
  selectedContentId?: string;
}

export type PresenceSource = readonly RemotePresence[];

export interface PresenceIndicatorProps {
  /** Consumer-supplied remote presence data. Empty/absent renders no mount. */
  source?: PresenceSource;
  /** Extra class on the presence row (in addition to `sd-presence`). */
  className?: string;
  /** Extra style for the presence row. */
  style?: CSSProperties;
  /** Accessible name for the collaborator list. @default "Active collaborators" */
  "aria-label"?: string;
}

/** Render a compact collaborator row from consumer-supplied presence data. */
export function PresenceIndicator({
  source,
  className,
  style,
  "aria-label": ariaLabel,
}: PresenceIndicatorProps): ReactNode {
  if (source === undefined || source.length === 0) {
    return null;
  }

  return (
    <ul
      className={joinClasses("sd-presence", className)}
      role="list"
      aria-label={ariaLabel ?? "Active collaborators"}
      style={{ ...(style ?? {}) }}
    >
      {source.map((presence) => (
        <li key={presence.id} className="sd-presence__item">
          <span
            className="sd-presence__dot"
            role="img"
            aria-label={presence.name}
            style={{ ...(presence.color ? { background: presence.color } : {}) }}
          >
            {initialFor(presence.name)}
          </span>
        </li>
      ))}
    </ul>
  );
}
