/**
 * Shared demo content vocabulary for the `@stardust-cms/dashboard` reference
 * example (SIFR-T-0036 / REQ-008).
 *
 * Single source of truth for the demo's editable target ids and the seed content
 * tree. Imported by BOTH:
 *
 *  - the demo **site** (`example/site`), which seeds its
 *    `StardustAdapterProvider` so the page renders standalone, and
 *  - the demo **admin** (`example/admin`), whose `createVersionedContentStoreAdapter`
 *    is seeded from the same tree so the editor opens on real content.
 *
 * Depends ONLY on the framework-agnostic protocol subpath — no React, no host or
 * iframe runtime — so both the store-adapter seed and the site can import it.
 *
 * Mirrors the structure of SIFR's `demo/shared/src/content-model.ts` (a nested
 * container plus 4 flat targets) so the reference example is directly comparable
 * to the working SIFR demo it re-bases.
 */

import type {
  CmsContent,
  ContentPayload,
} from "@stardust-cms/iframe-adapter/protocol";

/**
 * The demo's editable target ids. `hero`, `intro`, `showcase`, `features` are
 * flat targets; `split` holds a single `container` content item whose renderer
 * expands into two nested child targets — `split-col.1` / `split-col.2` — the
 * demo's nested-container targets.
 */
export const TARGET_IDS = {
  hero: "hero",
  intro: "intro",
  showcase: "showcase",
  features: "features",
  split: "split",
} as const;

/** The id of the `container` content item placed inside the `split` target. */
export const SPLIT_CONTAINER_ID = "split-col";

/** The two nested child targets produced by the split container. */
export const SPLIT_CHILD_TARGETS = {
  left: `${SPLIT_CONTAINER_ID}.1`,
  right: `${SPLIT_CONTAINER_ID}.2`,
} as const;

/** A single seed item: its target, index, and the {@link CmsContent}. */
export interface SeedItem {
  targetId: string;
  index: number;
  content: CmsContent;
}

/**
 * The demo's seed content tree. Ordered, keyed by (targetId, index). Six flat
 * items across four targets plus a nested container with four child items — the
 * "4–6 editable targets incl. a nested container" the task calls for.
 */
export const SEED_CONTENT: readonly SeedItem[] = [
  {
    targetId: TARGET_IDS.hero,
    index: 0,
    content: {
      id: "hero-title",
      type: "text",
      value: "Edit any website, live — backed by a versioned content engine.",
      styleGroup: "hero-title",
    },
  },
  {
    targetId: TARGET_IDS.hero,
    index: 1,
    content: {
      id: "hero-subtitle",
      type: "text",
      value:
        "Every edit is an append-only version. Toggle draft/live, publish, and inspect any past version — deletions never lose history.",
      styleGroup: "hero-subtitle",
    },
  },
  {
    targetId: TARGET_IDS.intro,
    index: 0,
    content: {
      id: "intro-body",
      type: "text",
      value:
        "This public site is wrapped once in StardustAdapterProvider and annotates its regions with EditableTarget. The admin embeds it and edits it over frame-link, storing every change in the Versioned Content Engine.",
      styleGroup: "intro-body",
    },
  },
  {
    targetId: TARGET_IDS.showcase,
    index: 0,
    content: {
      id: "showcase-image",
      type: "image",
      value:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="480" height="240" rx="16" fill="url(#g)"/><text x="240" y="130" font-family="sans-serif" font-size="26" fill="white" text-anchor="middle">Versioned Content</text></svg>',
        ),
      styleGroup: "showcase-image",
    },
  },
  {
    targetId: TARGET_IDS.features,
    index: 0,
    content: {
      id: "feature-1",
      type: "text",
      value: "Append-only versions — nothing is ever destructively overwritten",
      styleGroup: "feature-item",
    },
  },
  {
    targetId: TARGET_IDS.features,
    index: 1,
    content: {
      id: "feature-2",
      type: "text",
      value: "Publish advances live; drafts stay invisible until you publish",
      styleGroup: "feature-item",
    },
  },
  {
    targetId: TARGET_IDS.features,
    index: 2,
    content: {
      id: "feature-3",
      type: "text",
      value: "A pre-delete version still materializes the deleted item",
      styleGroup: "feature-item",
    },
  },
  // Nested container: a single `container` content item in the `split` target.
  {
    targetId: TARGET_IDS.split,
    index: 0,
    content: {
      id: SPLIT_CONTAINER_ID,
      type: "container",
      column: false,
      styleGroup: "split",
    },
  },
  {
    targetId: SPLIT_CHILD_TARGETS.left,
    index: 0,
    content: {
      id: "split-left-heading",
      type: "text",
      value: "Nested container — left column",
      styleGroup: "split-heading",
    },
  },
  {
    targetId: SPLIT_CHILD_TARGETS.right,
    index: 0,
    content: {
      id: "split-right-heading",
      type: "text",
      value: "Nested container — right column",
      styleGroup: "split-heading",
    },
  },
];

/** Build a `cms/sendElements` payload for a single seed item. */
export function seedItemToPayload(item: SeedItem): ContentPayload {
  return {
    targetId: item.targetId,
    contentId: item.content.id,
    index: item.index,
    content: item.content,
  };
}

/** Every seed item as a `cms/sendElements` payload, ready to inject/render. */
export function seedPayloads(): ContentPayload[] {
  return SEED_CONTENT.map(seedItemToPayload);
}
