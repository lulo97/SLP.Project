import { test, expect } from "@playwright/test";
import { loginAsAdmin, FRONTEND_URL } from "../note/noteHelper";

/**
 * Covers:
 *  Scenario 2 – Scroll Tracking and Progress Saving (debounced PUT)
 *  Scenario 9 – Edge Case: Reaching the End of the Article (100%)
 */
test.describe("Reading progress – scroll tracking", () => {
  // ── helpers ────────────────────────────────────────────────────────────────

  /** Repeat filler so the article is long enough to scroll */
  const LONG_CONTENT = "Aquatic ecosystems are complex and diverse. ".repeat(300);

  async function createNoteSource(
    page: Parameters<typeof loginAsAdmin>[0],
    title: string,
    content: string,
  ): Promise<string> {
    await page.goto(`${FRONTEND_URL}/source`);
    await page.getByTestId("source-list-add-text-btn").click();
    await page.waitForURL(`${FRONTEND_URL}/source/new-text`);
    await page.getByTestId("source-text-create-title-input").fill(title);
    await page.getByTestId("source-note-create-content-input").fill(content);
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
    await expect(page.getByTestId("source-list")).toBeVisible();
    const item = page.locator(`[data-testid="source-list-item-${sourceId}"]`);
    await expect(item).toBeVisible();
    await item
      .locator(`[data-testid="source-list-delete-btn-${sourceId}"]`)
      .click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(item).not.toBeVisible();
  }

  // ── Scenario 2: Scroll Tracking ────────────────────────────────────────────

  test("Scenario 2 – progress bar updates on scroll and PUT is sent after debounce", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const title = `Scroll Track Test ${Date.now()}`;
    const sourceId = await createNoteSource(page, title, LONG_CONTENT);

    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    // Capture PUT /progress requests
    const progressRequests: { url: string; body: any }[] = [];
    page.on("request", (req) => {
      if (req.method() === "PUT" && req.url().includes("/progress")) {
        let body: any = null;
        try {
          body = JSON.parse(req.postData() ?? "{}");
        } catch {}
        progressRequests.push({ url: req.url(), body });
      }
    });

    // Scroll to 500 px
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }));

    // Verify progress bar fill has updated (not 0%)
    const fill = page.getByTestId("reading-progress-bar-fill");
    await expect(async () => {
      const style = await fill.getAttribute("style");
      const match = style?.match(/width:\s*([\d.]+)%/);
      const pct = match ? parseFloat(match[1]) : 0;
      expect(pct).toBeGreaterThan(0);
    }).toPass({ timeout: 3000 });

    // Wait for the debounce (800 ms) + some margin
    await page.waitForTimeout(1200);

    // At least one PUT must have been fired
    expect(progressRequests.length).toBeGreaterThanOrEqual(1);

    const lastReq = progressRequests[progressRequests.length - 1];

    // URL must contain the correct source id (not NaN)
    expect(lastReq.url).toContain(`/source/${sourceId}/progress`);
    expect(lastReq.url).not.toContain("NaN");

    // Body shape: { lastPosition: { scrollPosition, percentComplete } }
    expect(lastReq.body).toHaveProperty("lastPosition");
    expect(lastReq.body.lastPosition).toHaveProperty("scrollPosition");
    expect(lastReq.body.lastPosition).toHaveProperty("percentComplete");
    expect(lastReq.body.lastPosition.scrollPosition).toBeGreaterThan(0);
    expect(lastReq.body.lastPosition.percentComplete).toBeGreaterThanOrEqual(0);
    expect(lastReq.body.lastPosition.percentComplete).toBeLessThanOrEqual(100);

    await deleteSource(page, sourceId);
  });

  // ── Scenario 9: Reaching the End ──────────────────────────────────────────

  test("Scenario 9 – scrolling to the bottom saves 100% progress", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const title = `End of Article Test ${Date.now()}`;
    const sourceId = await createNoteSource(page, title, LONG_CONTENT);

    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    const progressRequests: { body: any }[] = [];
    page.on("request", (req) => {
      if (req.method() === "PUT" && req.url().includes("/progress")) {
        let body: any = null;
        try {
          body = JSON.parse(req.postData() ?? "{}");
        } catch {}
        progressRequests.push({ body });
      }
    });

    // Scroll all the way to the bottom
    await page.evaluate(() =>
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      }),
    );

    // Progress bar should reach 100%
    const fill = page.getByTestId("reading-progress-bar-fill");
    await expect(async () => {
      const style = await fill.getAttribute("style");
      const match = style?.match(/width:\s*([\d.]+)%/);
      const pct = match ? parseFloat(match[1]) : 0;
      expect(pct).toBeCloseTo(100, 0);
    }).toPass({ timeout: 3000 });

    // Wait for debounce + margin
    await page.waitForTimeout(1200);

    // PUT must report 100%
    expect(progressRequests.length).toBeGreaterThanOrEqual(1);
    const last = progressRequests[progressRequests.length - 1];
    expect(last.body.lastPosition.percentComplete).toBe(100);

    await deleteSource(page, sourceId);
  });
});
