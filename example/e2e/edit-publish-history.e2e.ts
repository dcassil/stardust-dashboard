import { test, expect, type Page } from "@playwright/test";

/**
 * SIFR-T-0036 TC-001 — the full VCE-backed loop, made visible end-to-end:
 *
 *   seed → edit (draft) → preview draft vs live → delete → publish →
 *   inspect a PRE-DELETE version and ASSERT the deleted item reappears.
 *
 * This is the vision's headline proof and satisfies **SVER-I-0004 REQ-006**: the
 * Versioned Content Engine's historical-fidelity guarantee, surfaced through the
 * `@stardust-cms/dashboard` editor and asserted against a real browser + a real
 * cross-origin iframe (admin :5173 ↔ site :5174).
 *
 * Everything is driven through the admin UI (overlay clicks, the side-panel
 * field, the draft/live toggle, the Publish button, the version selector) and
 * asserted against the iframe's rendered DOM — no test hooks into engine
 * internals; the assertions ride the same injection path the demo uses.
 */

const SITE_FRAME = 'iframe[title="Embedded site preview"]';

async function waitConnected(page: Page): Promise<void> {
  await expect(page.locator(".admin-status")).toHaveAttribute(
    "data-state",
    "connected",
    { timeout: 30_000 },
  );
  await expect(page.locator('[data-target-id="hero"]')).toBeVisible();
  // The admin re-injects its VCE snapshot on connect, replacing the site's seed
  // ids (`hero-title`, …) with the engine's collection ids (`col-*`) at the same
  // slots. Wait for that so overlays/iframe elements carry the engine ids we key
  // the whole flow on (the historical-fidelity assertion tracks a `col-*` id).
  await expect(
    page.locator('.ov-item[data-content-id^="col-"]').first(),
  ).toBeVisible({ timeout: 30_000 });
}

/** The iframe-rendered element for a content id (ids are the engine col ids). */
function frameEl(page: Page, id: string) {
  return page.frameLocator(SITE_FRAME).locator(`#${cssEscape(id)}`);
}

function cssEscape(id: string): string {
  return id.replace(/\./g, "\\.");
}

test.describe("edit → preview → publish → inspect pre-delete history", () => {
  test("a pre-delete version still shows the deleted item after publish", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1360, height: 950 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(600); // let geometry settle

    // The seed content is already published (seed.ts publishes once), so the
    // hero title is live. The first engine-backed content item overlay (col-*)
    // is the hero title.
    const firstItem = page.locator('.ov-item[data-content-id^="col-"]').first();
    await expect(firstItem).toBeVisible();
    const deletedId = await firstItem.getAttribute("data-content-id");
    expect(deletedId).toBeTruthy();

    // ---- 1. Edit a target in DRAFT and confirm the iframe reflects it. ----
    await firstItem.click();
    const textField = page.getByTestId("panel-text");
    await expect(textField).toBeVisible();
    const EDITED = "E2E DRAFT EDIT — versioned";
    await textField.fill(EDITED);
    await expect(frameEl(page, deletedId!)).toHaveText(EDITED, {
      timeout: 15_000,
    });

    // ---- 2. Publish so this edit + the current content become a new live
    //         version. After publish the app switches to Live preview. ----
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("current-mode")).toHaveAttribute(
      "data-mode",
      "live",
    );
    await page.waitForTimeout(400);
    // Record which version this "everything present" state is (the newest one).
    const versionOptions = await page
      .getByTestId("version-select")
      .locator("option")
      .allTextContents();
    // e.g. ["(current draft)", "version 1", "version 2"] — pick the last.
    const preDeleteVersionLabel = versionOptions[versionOptions.length - 1]!;
    const preDeleteVersionValue = preDeleteVersionLabel.replace(/\D/g, "");
    expect(preDeleteVersionValue).not.toBe("");

    // ---- 3. Back to draft, DELETE the item, and publish again so live no
    //         longer contains it. ----
    await page.getByTestId("mode-draft").click();
    await expect(page.getByTestId("current-mode")).toHaveAttribute(
      "data-mode",
      "draft",
    );
    await page.waitForTimeout(300);

    // Hover the item to reveal its delete chrome, then delete.
    const itemForDelete = page.locator(
      `.ov-item[data-content-id="${deletedId}"]`,
    );
    await itemForDelete.hover();
    // The delete button (.ov-delete) is rendered alongside the item overlay.
    await page.locator(".ov-delete").first().click();

    // In the draft view the deleted item is gone from the iframe.
    await expect(frameEl(page, deletedId!)).toHaveCount(0, { timeout: 15_000 });

    await page.getByTestId("publish").click();
    await expect(page.getByTestId("current-mode")).toHaveAttribute(
      "data-mode",
      "live",
    );
    await page.waitForTimeout(400);

    // ---- 4. LIVE no longer shows the deleted item. ----
    await expect(frameEl(page, deletedId!)).toHaveCount(0, { timeout: 15_000 });

    // ---- 5. THE PAYOFF: select the PRE-DELETE version and assert the deleted
    //         item REAPPEARS (historical fidelity = SVER-I-0004 REQ-006). ----
    await page
      .getByTestId("version-select")
      .selectOption(preDeleteVersionValue);
    await expect(page.getByTestId("current-mode")).toHaveAttribute(
      "data-mode",
      "history",
    );
    await page.waitForTimeout(500);

    // The deleted item is present again, with the edited text we published.
    await expect(frameEl(page, deletedId!)).toHaveText(EDITED, {
      timeout: 15_000,
    });

    // Capture the historical view as the proof screenshot (GIF note: a recording
    // of this run is the demo's headline artifact; a still is captured here).
    await page.screenshot({
      path: "e2e/artifacts/pre-delete-history.png",
      fullPage: true,
    });
  });
});
