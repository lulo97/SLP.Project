import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  generateUniqueSource,
  createAuthenticatedPage,
  deleteSource,
  verifySourceDeletedViaApi,
} from "./source-helpers.js";

test.describe("Source Text Creation", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test("Create text source", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const unique = generateUniqueSource("Text");

    await page.goto(`${FRONTEND_URL}/source/new-text`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-text-create-card"]')).toBeVisible();

    await page.fill('[data-testid="source-text-create-title-input"]', unique.title);
    await page.fill('[data-testid="source-text-create-content-input"]', unique.content);
    await page.click('[data-testid="source-text-create-submit-button"]');

    await page.waitForURL(/\/source\/\d+$/, { timeout: 15000, waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-detail-title"]')).toHaveText(unique.title);
    await expect(page.locator('[data-testid="source-detail-type"]')).toHaveText("Note");
    await expect(page.locator('[data-testid="source-detail-content-preview"]')).toContainText(unique.content.substring(0, 50));

    const url = page.url();
    const id = parseInt(url.split("/").pop(), 10);
    await deleteSource(page, id);
    await verifySourceDeletedViaApi(request, id, authToken);
    await page.close();
  });
});