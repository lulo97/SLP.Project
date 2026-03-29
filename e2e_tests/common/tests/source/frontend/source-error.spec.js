// source-error.spec.js – error states, validation messages, and API failure handling

import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  createAuthenticatedPage,
} from "./source-helpers.js";

test.describe("Source – Error Handling & Validation", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  // ── Note create page ───────────────────────────────────────────────────────

  test("note: submit disabled when both fields are empty", async ({
    browser,
  }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-note`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.locator('[data-testid="source-note-create-submit-btn"]'),
    ).toBeDisabled();
    await page.close();
  });

  test("note: submit disabled when only title is filled", async ({
    browser,
  }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-note`, {
      waitUntil: "domcontentloaded",
    });

    await page.fill(
      '[data-testid="source-text-create-title-input"]',
      "A title",
    );
    await expect(
      page.locator('[data-testid="source-note-create-submit-btn"]'),
    ).toBeDisabled();
    await page.close();
  });

  test("note: submit disabled when only content is filled", async ({
    browser,
  }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-note`, {
      waitUntil: "domcontentloaded",
    });

    await page.fill(
      '[data-testid="source-text-create-content-input"]',
      "Some content",
    );
    await expect(
      page.locator('[data-testid="source-note-create-submit-btn"]'),
    ).toBeDisabled();
    await page.close();
  });

  test("note: submit enabled only when both fields are filled", async ({
    browser,
  }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-note`, {
      waitUntil: "domcontentloaded",
    });

    await page.fill('[data-testid="source-text-create-title-input"]', "Title");
    await page.fill(
      '[data-testid="source-text-create-content-input"]',
      "Content",
    );
    await expect(
      page.locator('[data-testid="source-note-create-submit-btn"]'),
    ).toBeEnabled();
    await page.close();
  });

  // ── URL create page ────────────────────────────────────────────────────────

  test("url: submit disabled when title is empty", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-url`, {
      waitUntil: "domcontentloaded",
    });

    await page.fill(
      '[data-testid="source-url-create-url-input"]',
      "https://example.com",
    );
    await expect(
      page.locator('[data-testid="source-url-create-submit-btn"]'),
    ).toBeDisabled();
    await page.close();
  });

  test("url: submit disabled when URL is empty", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-url`, {
      waitUntil: "domcontentloaded",
    });

    await page.fill('[data-testid="source-url-create-title-input"]', "A title");
    await expect(
      page.locator('[data-testid="source-url-create-submit-btn"]'),
    ).toBeDisabled();
    await page.close();
  });

  test("url: submit disabled when both fields are empty", async ({
    browser,
  }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-url`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.locator('[data-testid="source-url-create-submit-btn"]'),
    ).toBeDisabled();
    await page.close();
  });

  // ── Upload page ────────────────────────────────────────────────────────────

  test("upload: submit disabled when no file selected", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/upload`, {
      waitUntil: "domcontentloaded",
    });

    await page.fill('[data-testid="source-upload-title-input"]', "Title");
    await expect(
      page.locator('[data-testid="source-upload-submit-btn"]'),
    ).toBeDisabled();
    await page.close();
  });

  test("upload: submit disabled when title is empty", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/upload`, {
      waitUntil: "domcontentloaded",
    });

    await page.setInputFiles(
      '[data-testid="source-upload-dragger"] input[type="file"]',
      { name: "f.txt", mimeType: "text/plain", buffer: Buffer.from("content") },
    );
    await expect(
      page.locator('[data-testid="source-upload-submit-btn"]'),
    ).toBeDisabled();
    await page.close();
  });

  // ── Detail page — non-existent source ─────────────────────────────────────

  test("detail: shows error state for a non-existent source ID", async ({
    browser,
  }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/999999999`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.locator('[data-testid="source-detail-error"]'),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('[data-testid="source-detail-error-message"]'),
    ).toBeVisible();
    await page.close();
  });

  test("detail: retry button is visible on error state", async ({
    browser,
  }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/999999999`, {
      waitUntil: "domcontentloaded",
    });

    await page
      .locator('[data-testid="source-detail-error"]')
      .waitFor({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="source-detail-retry-btn"]'),
    ).toBeVisible();
    await page.close();
  });

  test("detail: loading skeleton shown before content loads", async ({
    browser,
  }) => {
    const page = await createAuthenticatedPage(browser, authToken);

    // Intercept the API to delay the response so we can observe the skeleton
    await page.route(`**/api/source/**`, async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });

    await page.goto(`${FRONTEND_URL}/source/1`, {
      waitUntil: "domcontentloaded",
    });

    // Skeleton should be visible during the load delay
    await expect(
      page.locator('[data-testid="source-detail-loading"]'),
    ).toBeVisible({
      timeout: 2_000,
    });

    await page.close();
  });

  // ── Unauthenticated access ─────────────────────────────────────────────────

  test("redirects to login when session is missing", async ({ browser }) => {
    // Fresh context with no token
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${FRONTEND_URL}/source`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
    await page.close();
  });

  test("redirects to login when accessing detail page without session", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${FRONTEND_URL}/source/1`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
    await page.close();
  });
});
