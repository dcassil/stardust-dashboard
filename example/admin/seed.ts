/**
 * Seed a {@link VersionedContentStoreAdapter} from the shared demo content tree,
 * then publish once so the seeded content is LIVE (not just draft).
 *
 * The VCE adapter mints its own opaque `collectionId`s (`col-0`, `col-1`, …) as
 * content is created, so we cannot seed by handing it pre-made ids — instead we
 * replay the seed tree as a sequence of `insert` ops (the exact path a real
 * drag-drop takes), which is also what the engine's append-only model wants.
 * After seeding we `publish()` so the editor opens with content already live and
 * a non-empty live version to record for the historical-fidelity flow.
 *
 * Returns the adapter plus the live version recorded immediately after the seed
 * publish, so callers have a known "everything present" version to inspect later.
 */

import type { ContentSnapshot } from "@stardust-cms/dashboard";
import { SEED_CONTENT } from "../shared/content-model.js";
import {
  createVersionedContentStoreAdapter,
  type VersionedContentStoreAdapter,
} from "../src/versionedContentStoreAdapter.js";

export interface SeededAdapter {
  adapter: VersionedContentStoreAdapter;
  /** The live version right after the seed publish (all seed content present). */
  seededVersion: string;
  /** The live snapshot right after seeding. */
  liveSnapshot: ContentSnapshot;
}

/** Build a seeded, published VCE-backed adapter from the shared seed tree. */
export function createSeededAdapter(): SeededAdapter {
  const adapter = createVersionedContentStoreAdapter();

  for (const item of SEED_CONTENT) {
    adapter.apply({
      kind: "insert",
      targetId: item.targetId,
      index: item.index,
      payload: {
        type: item.content.type,
        ...(item.content.value !== undefined ? { value: item.content.value } : {}),
        ...(item.content.styleGroup !== undefined
          ? { styleGroup: item.content.styleGroup }
          : {}),
        ...(item.content.column !== undefined
          ? { column: item.content.column }
          : {}),
      },
    });
  }

  const liveSnapshot = adapter.publish?.() ?? adapter.getSnapshot();
  const seededVersion = adapter.getLiveVersion();

  return { adapter, seededVersion, liveSnapshot };
}
