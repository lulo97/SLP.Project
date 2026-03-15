// source-upload.spec.js – UI tests for file upload source creation

import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  createAuthenticatedPage,
  makeNoteSource,
  deleteSourceViaApi,
} from "./source-helpers.js";

// A small in-memory txt file used across upload tests
const TEST_FILE = {
  name:     "test-source.txt",
  mimeType: "text/plain",
  buffer:   Buffer.from("This is auto-generated test file content for upload testing."),
};

test.describe("Source – File Upload", () => {
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

  test("uploads a .txt file and shows detail page", async ({ browser }) => {
    const page   = await createAuthenticatedPage(browser, authToken);
    const source = makeNoteSource("Upload");

    await page.goto(`${FRONTEND_URL}/source/upload`, { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-testid="source-upload-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-upload-form"]')).toBeVisible();

    // Submit is disabled with no file
    await page.fill('[data-testid="source-upload-title-input"]', source.title);
    await expect(page.locator('[data-testid="source-upload-submit-btn"]')).toBeDisabled();

    // Attach file
    await page.setInputFiles(
      '[data-testid="source-upload-dragger"] input[type="file"]',
      TEST_FILE
    );

    // Selected file name should appear
    await expect(page.locator('[data-testid="source-upload-selected-file"]')).toContainText(
      TEST_FILE.name
    );
    await expect(page.locator('[data-testid="source-upload-submit-btn"]')).toBeEnabled();

    await page.click('[data-testid="source-upload-submit-btn"]');
    await page.waitForURL(/\/source\/\d+$/, { timeout: 20_000 });

    createdId = parseInt(page.url().split("/").pop(), 10);

    // Detail page assertions
    await expect(page.locator('[data-testid="source-detail-article"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-article-title"]')).toHaveText(source.title);
    // txt files are stored as "txt" type
    await expect(page.locator('[data-testid="source-detail-type-badge"]')).toContainText(/txt|text/i);

    await page.close();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  test("submit stays disabled when title is empty even with a file", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/upload`, { waitUntil: "domcontentloaded" });

    await page.setInputFiles(
      '[data-testid="source-upload-dragger"] input[type="file"]',
      TEST_FILE
    );

    // No title → still disabled
    await expect(page.locator('[data-testid="source-upload-submit-btn"]')).toBeDisabled();
    await page.close();
  });

  test("submit stays disabled when no file is selected", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/upload`, { waitUntil: "domcontentloaded" });

    await page.fill('[data-testid="source-upload-title-input"]', "Title without file");
    await expect(page.locator('[data-testid="source-upload-submit-btn"]')).toBeDisabled();
    await page.close();
  });
});