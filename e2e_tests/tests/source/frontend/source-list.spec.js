import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  generateUniqueSource,
  createAuthenticatedPage,
  deleteSource,
  verifySourceDeletedViaApi,
} from "./source-helpers.js";

test.describe("Source List Interactions", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test("View and delete from list", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const unique = generateUniqueSource("ListTest");

    // Create a text source first
    await page.goto(`${FRONTEND_URL}/source/new-text`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-text-create-card"]')).toBeVisible();
    await page.fill('[data-testid="source-text-create-title-input"]', unique.title);
    await page.fill('[data-testid="source-text-create-content-input"]', unique.content);
    await page.click('[data-testid="source-text-create-submit-button"]');
    await page.waitForURL(/\/source\/\d+$/, { timeout: 15000, waitUntil: "domcontentloaded" });
    const url = page.url();
    const id = parseInt(url.split("/").pop(), 10);

    // Go back to list
    await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(`[data-testid="source-list-item-${id}"]`)).toBeVisible();

    // Click view button
    await page.click(`[data-testid="source-list-view-${id}"]`);
    await page.waitForURL(`**/source/${id}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-detail-title"]')).toHaveText(unique.title);

    // Go back and delete from list
    await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
    await page.click(`[data-testid="source-list-delete-${id}"]`);
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');
    await expect(page.locator('.ant-message-success:has-text("Source deleted")')).toBeVisible();

    await expect(page.locator(`[data-testid="source-list-item-${id}"]`)).toHaveCount(0);
    await verifySourceDeletedViaApi(request, id, authToken);
    await page.close();
  });
});