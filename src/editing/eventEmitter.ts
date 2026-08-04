/**
 * The post-commit editing-event emitter (DASH-T-0004).
 *
 * The controller QUEUES {@link EditingEvent}s during an action (see
 * `useEditingController`); this emitter flushes them to the LATEST
 * {@link EditingCallbacks} AFTER commit, exactly once each, never during render
 * (REQ-006 / NFR-006).
 *
 * The scheduling is deliberately simple and deterministic: because the queue is
 * DRAINED on flush, each event is dispatched exactly once regardless of how many
 * times the flushing effect runs — so it is inherently safe against React 18
 * StrictMode's double-invoked effects and extra re-renders, with no
 * "last-emitted" bookkeeping. The pure {@link flushEditingEvents} contains the
 * dispatch logic (unit-testable without React); {@link useEditingEventEmitter}
 * is the thin React wrapper.
 */

import { useEffect, useRef } from "react";
import { dispatchEditingEvent, type EditingEvent } from "./editingEvents.js";
import type { EditingCallbacks } from "./editingTypes.js";

/**
 * Dispatch a drained batch of events to the callbacks, in order. Pure — no
 * React, no scheduling — so once-per-action ordering can be unit-tested in
 * isolation.
 */
export function flushEditingEvents(
  events: readonly EditingEvent[],
  callbacks: EditingCallbacks,
): void {
  for (const event of events) {
    dispatchEditingEvent(event, callbacks);
  }
}

/**
 * Flush the controller's queued events post-commit. Runs after every commit and
 * drains the queue, so events an action queued are dispatched exactly once,
 * post-commit, to the latest callbacks (kept in a ref so a changed callback prop
 * never double-registers or drops events). Draining an empty queue is a no-op.
 */
export function useEditingEventEmitter(
  drainPendingEvents: () => readonly EditingEvent[],
  callbacks: EditingCallbacks,
): void {
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    flushEditingEvents(drainPendingEvents(), callbacksRef.current);
  });
}
