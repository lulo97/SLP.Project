import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  createAuthenticatedPage,
} from "./source-helpers.js";

test.describe("Source Error Handling", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test("Show validation feedback when fields are missing", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);

    // Text creation - button disabled when title missing
    await page.goto(`${FRONTEND_URL}/source/new-note`, { waitUntil: "domcontentloaded" });
    await page.fill('[data-testid="source-note-create-content-input"]', "Some content");
    await expect(page.locator('[data-testid="source-note-create-submit-button"]')).toBeDisabled();

    // URL creation - button enabled, click shows warning
    await page.goto(`${FRONTEND_URL}/source/new-url`, { waitUntil: "domcontentloaded" });
    await page.fill('[data-testid="source-url-create-title-input"]', "Title");
    await page.click('[data-testid="source-url-create-submit-button"]');
    await expect(
      page.locator('.ant-message-warning:has-text("Title and URL are required")')
    ).toBeVisible();

    // Upload - button disabled when no file
    await page.goto(`${FRONTEND_URL}/source/upload`, { waitUntil: "domcontentloaded" });
    await page.fill('[data-testid="source-upload-title-input"]', "Title");
    await expect(page.locator('[data-testid="source-upload-submit-button"]')).toBeDisabled();

    await page.close();
  });

  test("Show error on API failure", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/999999`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-detail-error"]')).toBeVisible();
    await page.close();
  });
});