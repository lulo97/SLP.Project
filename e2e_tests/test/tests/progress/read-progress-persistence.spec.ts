import { test, expect } from "@playwright/test";
import { loginAsAdmin, FRONTEND_URL } from "../note/noteHelper";

/**
 * Covers:
 *  Scenario 7 – Progress Persistence Across Page Reloads
 *  Scenario 8 – Progress for Different Sources Is Independent
 */
test.describe("Reading progress – persistence and isolation", () => {
  const LONG_CONTENT = "Oceanography studies the physical and biological aspects of the ocean. ".repeat(
    300,
  );
  const SCROLL_TARGET = 600;

  // ── helpers ────────────────────────────────────────────────────────────────

  async function createNoteSource(
    page: Parameters<typeof loginAsAdmin>[0],
    title: string,
    content: string,
  ): Promise<string> {
    await page.goto(`${FRONTEND_URL}/source`);
    await page.getByTestId("source-list-add-text-btn").click();
    await page.waitForURL(`${FRONTEND_URL}/source/new-text`);
    await page.getByTestId("source-text-create-title-input").fill(title);
    await page.getByTestId("source-text-create-content-input").fill(content);
    await page.getByTestId("source-note-create-submit-btn").click();
    await page.waitForURL(/\/source\/\d+/);
    const match = page.url().match(/\/source\/(\d+)/);
    return match![1];
  }

  async function deleteSource(
    page: Parameters<typeof loginAsAdmin>[0],
    sourceId: string,
  ) {
    await page.goto(`${FRONTEND_URL}/source`);
    const item = page.locator(`[data-testid="source-list-item-${sourceId}"]`);
    await expect(item).toBeVisible();
    await item
      .locator(`[data-testid="source-list-delete-btn-${sourceId}"]`)
      .click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(item).not.toBeVisible();
  }

  /** Open source, scroll, wait for debounce, navigate away to flush final save. */
  async function scrollAndLeave(
    page: Parameters<typeof loginAsAdmin>[0],
    sourceId: string,
    scrollTop: number,
  ) {
    await page.goto(`${FRONTEND_URL}/source/${sourceId}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      scrollTop,
    );
    await page.waitForTimeout(1200); // debounce + buffer
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId("source-list")).toBeVisible();
  }

  // ── Scenario 7: Persistence Across Reloads ────────────────────────────────

  test("Scenario 7 – saved progress is restored after a full page reload", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const title = `Persistence Test ${Date.now()}`;
    const sourceId = await createNoteSource(page, title, LONG_CONTENT);

    // First visit: scroll and let it save
    await scrollAndLeave(page, sourceId, SCROLL_TARGET);

    // Second visit: verify restored state
    await page.goto(`${FRONTEND_URL}/source/${sourceId}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    // Resume toast should appear (progress > 100 px)
    const toast = page.getByTestId("source-detail-resume-toast");
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Progress bar fill must not be 0%
    const fill = page.getByTestId("reading-progress-bar-fill");
    await expect(async () => {
      const style = await fill.getAttribute("style");
      const match = style?.match(/width:\s*([\d.]+)%/);
      const pct = match ? parseFloat(match[1]) : 0;
      expect(pct).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });

    // Header resume button must be visible
    await expect(page.getByTestId("source-detail-resume-btn")).toBeVisible();

    // Clicking resume should scroll the page back
    await toast.click();
    await page.waitForTimeout(800); // smooth scroll
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    await deleteSource(page, sourceId);
  });

  // ── Scenario 8: Progress Is Independent Per Source ────────────────────────

  test("Scenario 8 – progress of source A does not affect source B", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const titleA = `Source A Progress ${Date.now()}`;
    const titleB = `Source B No Progress ${Date.now() + 1}`;

    // Create both sources
    const sourceIdA = await createNoteSource(page, titleA, LONG_CONTENT);
    const sourceIdB = await createNoteSource(page, titleB, LONG_CONTENT);

    // Scroll source A and leave (saves progress for A)
    await scrollAndLeave(page, sourceIdA, SCROLL_TARGET);

    // Open source B — should have NO saved progress
    await page.goto(`${FRONTEND_URL}/source/${sourceIdB}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    // Give loadProgress() time to finish
    await page.waitForTimeout(1000);

    // Source B: no resume toast
    await expect(
      page.getByTestId("source-detail-resume-toast"),
    ).not.toBeVisible();

    // Source B: no resume header button
    await expect(
      page.getByTestId("source-detail-resume-btn"),
    ).not.toBeVisible();

    // Source B: progress bar at 0%
    const fillB = page.getByTestId("reading-progress-bar-fill");
    const styleB = await fillB.getAttribute("style");
    const pctB = parseFloat(styleB?.match(/width:\s*([\d.]+)%/)?.[1] ?? "0");
    expect(pctB).toBe(0);

    // Verify source A still has its progress
    await page.goto(`${FRONTEND_URL}/source/${sourceIdA}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();
    await expect(
      page.getByTestId("source-detail-resume-toast"),
    ).toBeVisible({ timeout: 5000 });

    // Cleanup
    await deleteSource(page, sourceIdA);
    await deleteSource(page, sourceIdB);
  });
});
