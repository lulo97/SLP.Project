import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  generateUniqueSource,
  createAuthenticatedPage,
  deleteSource,
  verifySourceDeletedViaApi,
} from "./source-helpers.js";

test.describe("Source URL Creation", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test("Create URL source", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const unique = generateUniqueSource("URL");

    await page.goto(`${FRONTEND_URL}/source/new-url`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-url-create-card"]')).toBeVisible();

    await page.fill('[data-testid="source-url-create-title-input"]', unique.title);
    await page.fill('[data-testid="source-url-create-url-input"]', unique.url);
    await page.click('[data-testid="source-url-create-submit-button"]');

    await page.waitForURL(/\/source\/\d+$/, { timeout: 15000, waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-detail-title"]')).toHaveText(unique.title);
    await expect(page.locator('[data-testid="source-detail-type"]')).toHaveText("Link");
    await expect(page.locator('[data-testid="source-detail-url"]')).toHaveText(unique.url);

    const url = page.url();
    const id = parseInt(url.split("/").pop(), 10);
    await deleteSource(page, id);
    await verifySourceDeletedViaApi(request, id, authToken);
    await page.close();
  });
});