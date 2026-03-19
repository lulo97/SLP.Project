// source-list.spec.js – UI tests for the source list page

import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  authenticate,
  createAuthenticatedPage,
  makeNoteSource,
  createNoteSourceViaApi,
  deleteSourceViaApi,
  assertSourceDeletedViaApi,
} from "./source-helpers.js";

test.describe("Source – List Page", () => {
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

  // ── List rendering ─────────────────────────────────────────────────────────

  test("shows a created source in the list", async ({ browser, request }) => {
    const source = makeNoteSource("List");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-testid="source-list"]')).toBeVisible();
    await expect(page.locator(`[data-testid="source-list-item-${createdId}"]`)).toBeVisible();
    await expect(
      page.locator(`[data-testid="source-list-item-link-${createdId}"]`)
    ).toContainText(source.title);
    await expect(
      page.locator(`[data-testid="source-list-item-type-${createdId}"]`)
    ).toContainText("Note");

    await page.close();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test("clicking the item link navigates to detail page", async ({ browser, request }) => {
    const source = makeNoteSource("NavTest");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
    await page.locator(`[data-testid="source-list-item-${createdId}"]`).waitFor();

    await page.click(`[data-testid="source-list-item-link-${createdId}"]`);
    await page.waitForURL(`**/source/${createdId}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-detail-article-title"]')).toHaveText(source.title);

    await page.close();
  });

  test("clicking the view button navigates to detail page", async ({ browser, request }) => {
    const source = makeNoteSource("ViewBtn");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
    await page.locator(`[data-testid="source-list-item-${createdId}"]`).waitFor();

    await page.click(`[data-testid="source-list-view-btn-${createdId}"]`);
    await page.waitForURL(`**/source/${createdId}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-detail-article"]')).toBeVisible();

    await page.close();
  });

  // ── Header action buttons ──────────────────────────────────────────────────

  test("Upload File button navigates to upload page", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.click('[data-testid="source-list-upload-btn"]');
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/upload`);
    await page.close();
  });

  test("Add from URL button navigates to URL create page", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.click('[data-testid="source-list-add-url-btn"]');
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-url`);
    await page.close();
  });

  test("Add Note button navigates to note create page", async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    await page.click('[data-testid="source-list-add-note-btn"]');
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-note`);
    await page.close();
  });

  // ── Delete from list ───────────────────────────────────────────────────────

  test("deletes a source from the list via popconfirm", async ({ browser, request }) => {
    const source = makeNoteSource("DeleteTest");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    const id     = dto.id;
    // Don't assign to createdId — this test manages its own lifecycle

    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
    await page.locator(`[data-testid="source-list-item-${id}"]`).waitFor();

    // Click delete — popconfirm appears
    await page.click(`[data-testid="source-list-delete-btn-${id}"]`);
    await page.locator(".ant-popconfirm-buttons .ant-btn-primary").click();

    await expect(
      page.locator('.ant-message-success:has-text("Source deleted")')
    ).toBeVisible({ timeout: 8_000 });

    // Item disappears from list
    await expect(page.locator(`[data-testid="source-list-item-${id}"]`)).toHaveCount(0);

    // Verify via API
    await assertSourceDeletedViaApi(request, authToken, id);
    await page.close();
  });

  test("cancel on delete popconfirm keeps the source", async ({ browser, request }) => {
    const source = makeNoteSource("CancelDelete");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
    await page.locator(`[data-testid="source-list-item-${createdId}"]`).waitFor();

    await page.click(`[data-testid="source-list-delete-btn-${createdId}"]`);
    // Click the Cancel button in the popconfirm
    await page.locator(".ant-popconfirm-buttons .ant-btn:not(.ant-btn-primary)").click();

    // Source must still be in the list
    await expect(
      page.locator(`[data-testid="source-list-item-${createdId}"]`)
    ).toBeVisible();

    await page.close();
  });
});