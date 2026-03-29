import { test, expect } from "@playwright/test";
import { loginAsAdmin, FRONTEND_URL } from "../note/noteHelper";

/**
 * Covers:
 *  Scenario 3 – Resume Toast Appearance
 *  Scenario 4 – Resume via Toast
 *  Scenario 5 – Resume via Header Button
 *  Scenario 6 – Dismiss Resume Toast
 */
test.describe("Reading progress – resume UI", () => {
  const LONG_CONTENT = "Marine biodiversity is incredible and fascinating. ".repeat(300);
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

  /**
   * Open a source, scroll to SCROLL_TARGET, wait for the debounce save,
   * then navigate away so the onUnmounted final save also fires.
   * Returns the sourceId.
   */
  async function openScrollAndLeave(
    page: Parameters<typeof loginAsAdmin>[0],
    sourceId: string,
  ) {
    await page.goto(`${FRONTEND_URL}/source/${sourceId}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      SCROLL_TARGET,
    );

    // Wait for debounce (800 ms) + buffer
    await page.waitForTimeout(1200);

    // Navigate away to trigger onUnmounted final save
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId("source-list")).toBeVisible();
  }

  // ── Scenario 3: Resume Toast Appears ──────────────────────────────────────

  test("Scenario 3 – resume toast and header button appear on reload with saved progress", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const title = `Resume Toast Test ${Date.now()}`;
    const sourceId = await createNoteSource(page, title, LONG_CONTENT);

    await openScrollAndLeave(page, sourceId);

    // Revisit the source
    await page.goto(`${FRONTEND_URL}/source/${sourceId}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    // Toast must appear
    await expect(
      page.getByTestId("source-detail-resume-toast"),
    ).toBeVisible({ timeout: 5000 });

    // Header resume button must be visible
    await expect(page.getByTestId("source-detail-resume-btn")).toBeVisible();

    await deleteSource(page, sourceId);
  });

  // ── Scenario 4: Resume via Toast ──────────────────────────────────────────

  test("Scenario 4 – clicking the resume toast scrolls to saved position and hides toast", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const title = `Resume Via Toast Test ${Date.now()}`;
    const sourceId = await createNoteSource(page, title, LONG_CONTENT);

    await openScrollAndLeave(page, sourceId);

    // Revisit
    await page.goto(`${FRONTEND_URL}/source/${sourceId}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    const toast = page.getByTestId("source-detail-resume-toast");
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Click the toast
    await toast.click();

    // Toast must disappear
    await expect(toast).not.toBeVisible();

    // Page should have scrolled (scrollY > 0)
    await page.waitForTimeout(800); // smooth scroll time
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    await deleteSource(page, sourceId);
  });

  // ── Scenario 5: Resume via Header Button ──────────────────────────────────

  test("Scenario 5 – clicking the header resume button scrolls to saved position", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const title = `Resume Via Header Test ${Date.now()}`;
    const sourceId = await createNoteSource(page, title, LONG_CONTENT);

    await openScrollAndLeave(page, sourceId);

    // Revisit at top
    await page.goto(`${FRONTEND_URL}/source/${sourceId}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    // Wait for progress to load
    const resumeBtn = page.getByTestId("source-detail-resume-btn");
    await expect(resumeBtn).toBeVisible({ timeout: 5000 });

    // Dismiss the toast so it doesn't interfere
    const dismissBtn = page.getByTestId("source-detail-resume-toast-dismiss-btn");
    if (await dismissBtn.isVisible()) await dismissBtn.click();

    // Scroll back to top first
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);

    // Click header resume button
    await resumeBtn.click();

    // Wait for smooth scroll
    await page.waitForTimeout(800);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    await deleteSource(page, sourceId);
  });

  // ── Scenario 6: Dismiss Resume Toast ──────────────────────────────────────

  test("Scenario 6 – dismissing the toast hides it without scrolling", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const title = `Dismiss Toast Test ${Date.now()}`;
    const sourceId = await createNoteSource(page, title, LONG_CONTENT);

    await openScrollAndLeave(page, sourceId);

    // Revisit at the very top
    await page.goto(`${FRONTEND_URL}/source/${sourceId}`);
    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    const toast = page.getByTestId("source-detail-resume-toast");
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Record scroll before dismiss
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Click the X dismiss button inside the toast
    await page.getByTestId("source-detail-resume-toast-dismiss-btn").click();

    // Toast must be gone
    await expect(toast).not.toBeVisible();

    // No scroll should have happened
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(scrollBefore);

    await deleteSource(page, sourceId);
  });
});
