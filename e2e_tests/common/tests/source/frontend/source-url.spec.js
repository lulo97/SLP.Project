// source-url.spec.js – UI tests for URL source creation

import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  createAuthenticatedPage,
  makeUrlSource,
  deleteSourceViaApi,
} from "./source-helpers.js";

test.describe("Source – URL Creation", () => {
  let authToken;
  let createdId = null;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test.afterEach(async ({ request }) => {
    if (createdId) {
      await deleteSourceViaApi(request, authToken, createdId);
      createdId = null;
    }
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  test("creates a URL source and shows detail page", async ({ browser }) => {
    const page   = await createAuthenticatedPage(browser, authToken);
    const source = makeUrlSource("URL");

    await page.goto(`${FRONTEND_URL}/source/new-url`, { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-testid="source-url-create-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-url-create-form"]')).toBeVisible();

    await page.fill('[data-testid="source-url-create-title-input"]', source.title);
    await page.fill('[data-testid="source-url-create-url-input"]',   source.url);

    await expect(page.locator('[data-testid="source-url-create-submit-btn"]')).toBeEnabled();
    await page.click('[data-testid="source-url-create-submit-btn"]');
    await page.waitForURL(/\/source\/\d+$/, { timeout: 15_000 });

    createdId = parseInt(page.url().split("/").pop(), 10);

    // Detail page
    await expect(page.locator('[data-testid="source-detail-article"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-article-title"]')).toHaveText(source.title);
    await expect(page.locator('[data-testid="source-detail-type-badge"]')).toContainText("URL");
    await expect(page.locator('[data-testid="source-detail-article-url-link"]')).toHaveText(source.url);

    await page.close();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  test("shows warning when URL field is empty on submit", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-url`, { waitUntil: "domcontentloaded" });

    await page.fill('[data-testid="source-url-create-title-input"]', "Title only");
    await page.click('[data-testid="source-url-create-submit-btn"]');

    await expect(
      page.locator('.ant-message-warning:has-text("Title and URL are required")')
    ).toBeVisible({ timeout: 5_000 });

    // Should stay on the same page
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-url`);
    await page.close();
  });

  test("shows warning when title field is empty on submit", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-url`, { waitUntil: "domcontentloaded" });

    await page.fill('[data-testid="source-url-create-url-input"]', "https://example.com");
    await page.click('[data-testid="source-url-create-submit-btn"]');

    await expect(
      page.locator('.ant-message-warning:has-text("Title and URL are required")')
    ).toBeVisible({ timeout: 5_000 });

    await page.close();
  });
});