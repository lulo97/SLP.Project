// source-note.spec.js – UI tests for note source creation
//
// Pattern: navigate to create form → fill → submit → assert detail page → delete via API

import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  createAuthenticatedPage,
  makeNoteSource,
  deleteSourceViaApi,
  assertSourceDeletedViaApi,
} from "./source-helpers.js";

test.describe("Source – Note Creation", () => {
  let authToken;
  let createdId = null; // track for afterEach cleanup

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  // Always clean up even if the test fails mid-way
  test.afterEach(async ({ request }) => {
    if (createdId) {
      await deleteSourceViaApi(request, authToken, createdId);
      createdId = null;
    }
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  test("creates a note source and shows detail page", async ({ browser, request }) => {
    const page   = await createAuthenticatedPage(browser, authToken);
    const source = makeNoteSource("Note");

    await page.goto(`${FRONTEND_URL}/source/new-note`, { waitUntil: "domcontentloaded" });

    // Form visible
    await expect(page.locator('[data-testid="source-text-create-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-text-create-form"]')).toBeVisible();

    // Submit is disabled until both fields are filled
    await expect(page.locator('[data-testid="source-text-create-submit-btn"]')).toBeDisabled();

    await page.fill('[data-testid="source-text-create-title-input"]', source.title);
    // Still disabled — content missing
    await expect(page.locator('[data-testid="source-text-create-submit-btn"]')).toBeDisabled();

    await page.fill('[data-testid="source-text-create-content-input"]', source.content);
    await expect(page.locator('[data-testid="source-text-create-submit-btn"]')).toBeEnabled();

    await page.click('[data-testid="source-text-create-submit-btn"]');
    await page.waitForURL(/\/source\/\d+$/, { timeout: 15_000 });

    createdId = parseInt(page.url().split("/").pop(), 10);

    // Detail page assertions
    await expect(page.locator('[data-testid="source-detail-article"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-article-title"]')).toHaveText(source.title);
    await expect(page.locator('[data-testid="source-detail-type-badge"]')).toHaveText("NOTE");
    await expect(page.locator('[data-testid="source-detail-content-plain"]')).toContainText(
      source.content.substring(0, 40)
    );

    await page.close();
    await assertSourceDeletedViaApi(request, authToken, createdId); // will 404 after cleanup
  });

  test("shows word count and read time stats", async ({ browser }) => {
    const page   = await createAuthenticatedPage(browser, authToken);
    const source = makeNoteSource("Stats");
    // ~200 words so read-time = 1 min
    source.content = Array(40).fill("word").join(" ") + " extra content to pad it out nicely.";

    await page.goto(`${FRONTEND_URL}/source/new-note`, { waitUntil: "domcontentloaded" });
    await page.fill('[data-testid="source-text-create-title-input"]', source.title);
    await page.fill('[data-testid="source-text-create-content-input"]', source.content);
    await page.click('[data-testid="source-text-create-submit-btn"]');
    await page.waitForURL(/\/source\/\d+$/, { timeout: 15_000 });

    createdId = parseInt(page.url().split("/").pop(), 10);

    await expect(page.locator('[data-testid="source-detail-word-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-read-time"]')).toBeVisible();

    await page.close();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  test("submit stays disabled when title is empty", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-note`, { waitUntil: "domcontentloaded" });

    await page.fill('[data-testid="source-text-create-content-input"]', "Some content here");
    await expect(page.locator('[data-testid="source-text-create-submit-btn"]')).toBeDisabled();

    await page.close();
  });

  test("submit stays disabled when content is empty", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source/new-note`, { waitUntil: "domcontentloaded" });

    await page.fill('[data-testid="source-text-create-title-input"]', "Some title");
    await expect(page.locator('[data-testid="source-text-create-submit-btn"]')).toBeDisabled();

    await page.close();
  });
});