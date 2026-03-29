import { test, expect } from "@playwright/test";
import { loginAsAdmin, FRONTEND_URL } from "../note/noteHelper";

/**
 * Covers:
 *  Scenario 1 – Initial Load Without Progress
 *  Scenario 10 – Very Short Content (No Scroll)
 */
test.describe("Reading progress – initial state", () => {
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
    await expect(page.getByTestId("source-list")).toBeVisible();
    const item = page.locator(`[data-testid="source-list-item-${sourceId}"]`);
    await expect(item).toBeVisible();
    await item
      .locator(`[data-testid="source-list-delete-btn-${sourceId}"]`)
      .click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(item).not.toBeVisible();
  }

  // ── Scenario 1: Initial Load Without Progress ──────────────────────────────

  test("Scenario 1 – brand-new source shows 0% progress and no resume UI", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const title = `Progress Init Test ${Date.now()}`;
    const content = `${"Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(
      60,
    )}`;

    const sourceId = await createNoteSource(page, title, content);

    // Article must be visible before we check anything
    await expect(page.getByTestId("source-detail-article")).toBeVisible();

    // Progress bar fill must be 0%
    const fill = page.getByTestId("reading-progress-bar-fill");
    await expect(fill).toHaveAttribute("style", /width:\s*0%/);

    // Resume button must NOT be present
    await expect(
      page.getByTestId("source-detail-resume-btn"),
    ).not.toBeVisible();

    // Resume toast must NOT be present
    await expect(
      page.getByTestId("source-detail-resume-toast"),
    ).not.toBeVisible();

    await deleteSource(page, sourceId);
  });
});
