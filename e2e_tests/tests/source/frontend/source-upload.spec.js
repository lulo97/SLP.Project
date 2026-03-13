import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  generateUniqueSource,
  createAuthenticatedPage,
  deleteSource,
  verifySourceDeletedViaApi,
} from "./source-helpers.js";

test.describe("Source Upload", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test("Upload file source", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const unique = generateUniqueSource("Upload");

    await page.goto(`${FRONTEND_URL}/source/upload`, { waitUntil: "domcontentloaded" });

    await page.fill('[data-testid="source-upload-title-input"]', unique.title);

    const fileContent = "This is a test file content.";
    const file = {
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(fileContent),
    };
    await page.setInputFiles('[data-testid="source-upload-dragger"] input[type="file"]', file);

    await page.click('[data-testid="source-upload-submit-button"]');

    await page.waitForURL(/\/source\/\d+$/, { timeout: 15000, waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-detail-info-card"]')).toBeVisible();

    await expect(page.locator('[data-testid="source-detail-title"]')).toHaveText(unique.title);
    await expect(page.locator('[data-testid="source-detail-type"]')).toHaveText("Text");
    await expect(page.locator('[data-testid="source-detail-content-preview"]')).toContainText(fileContent);

    const url = page.url();
    const id = parseInt(url.split("/").pop(), 10);
    await deleteSource(page, id);
    await verifySourceDeletedViaApi(request, id, authToken);
    await page.close();
  });
});