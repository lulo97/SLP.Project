// source-favourite.spec.js – favorites modal opened via the selection bubble

import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  authenticate,
  createAuthenticatedPage,
  createNoteSourceViaApi,
  deleteSourceViaApi,
  goToSourceDetail,
  selectTextInArticle,
  makeNoteSource,
} from "./source-helpers.js";

// ── Cleanup helper: delete all favorites for the test user via API ────────────
async function deleteAllFavorites(request, token) {
  const res = await request.get(`${API_BASE_URL}/favorites`, {
    headers: { "X-Session-Token": token },
  });
  if (res.status() !== 200) return;
  const items = await res.json();
  await Promise.all(
    items.map((fav) =>
      request.delete(`${API_BASE_URL}/favorites/${fav.id}`, {
        headers: { "X-Session-Token": token },
      })
    )
  );
}

test.describe("Source – Favorites via Selection Bubble", () => {
  let authToken;
  let createdSourceId = null;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test.afterEach(async ({ request }) => {
    // Clean favorites first (favorites don't cascade-delete with source)
    await deleteAllFavorites(request, authToken);
    if (createdSourceId) {
      await deleteSourceViaApi(request, authToken, createdSourceId);
      createdSourceId = null;
    }
  });

  // ── Modal appearance ───────────────────────────────────────────────────────

  test("Save button opens the favorites modal with selected text pre-filled", async ({
    browser,
    request,
  }) => {
    const source = makeNoteSource("FavModal");
    source.content = "The aurora borealis illuminates the night sky with vivid colors.";
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdSourceId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdSourceId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);
    await page.click('[data-testid="selection-bubble-save-btn"]');

    // Modal is visible
    await expect(page.locator('[data-testid="source-detail-favorite-modal"]')).toBeVisible({
      timeout: 5_000,
    });

    // Text input should be pre-filled with the selection
    const textValue = await page
      .locator('[data-testid="source-detail-favorite-text-input"]')
      .inputValue();
    expect(textValue.length).toBeGreaterThan(0);

    // Type radio group is visible
    await expect(page.locator('[data-testid="source-detail-favorite-type-group"]')).toBeVisible();

    await page.close();
  });

  test("all four type options are available", async ({ browser, request }) => {
    const source = makeNoteSource("FavTypes");
    source.content = "Test content for type selection testing purposes only.";
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdSourceId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdSourceId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 15);
    await page.click('[data-testid="selection-bubble-save-btn"]');
    await page.locator('[data-testid="source-detail-favorite-modal"]').waitFor();

    await expect(page.locator('[data-testid="source-detail-favorite-type-word"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-favorite-type-phrase"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-favorite-type-idiom"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-favorite-type-other"]')).toBeVisible();

    await page.close();
  });

  test("modal defaults to type = word", async ({ browser, request }) => {
    const source = makeNoteSource("FavDefault");
    source.content = "Default type is word, test content here.";
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdSourceId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdSourceId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 15);
    await page.click('[data-testid="selection-bubble-save-btn"]');
    await page.locator('[data-testid="source-detail-favorite-modal"]').waitFor();

    // The "word" radio button should be checked (Ant Design adds ant-radio-button-wrapper-checked)
    await expect(
      page.locator('[data-testid="source-detail-favorite-type-word"]')
    ).toHaveClass(/checked/);

    await page.close();
  });

  // ── Save flow ──────────────────────────────────────────────────────────────

  test("saving a favorite closes the modal and shows success notification", async ({
    browser,
    request,
  }) => {
    const source = makeNoteSource("FavSave");
    source.content = "Serendipity is a wonderful word for unexpected fortune.";
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdSourceId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdSourceId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);
    await page.click('[data-testid="selection-bubble-save-btn"]');
    await page.locator('[data-testid="source-detail-favorite-modal"]').waitFor();

    // Click the OK / Save button in the modal footer
    await page.locator('.ant-modal-footer .ant-btn-primary').click();

    // Modal closes
    await expect(
      page.locator('[data-testid="source-detail-favorite-modal"]')
    ).toBeHidden({ timeout: 5_000 });

    // Success notification
    await expect(page.locator('[data-testid="source-detail-notification"]')).toBeVisible({
      timeout: 4_000,
    });
    await expect(page.locator('[data-testid="source-detail-notification"]')).toContainText(
      "Saved to favorites"
    );
    await expect(page.locator('[data-testid="source-detail-notification"]')).toHaveAttribute(
      "data-notif-type",
      "success"
    );

    await page.close();
  });

  test("saved favorite appears in the API favorites list", async ({ browser, request }) => {
    const source = makeNoteSource("FavApi");
    source.content = "Ephemeral means lasting for a very short time.";
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdSourceId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdSourceId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 15);
    await page.click('[data-testid="selection-bubble-save-btn"]');
    await page.locator('[data-testid="source-detail-favorite-modal"]').waitFor();

    // Add a note
    await page.fill('[data-testid="source-detail-favorite-note-input"]', "Test note for API check");
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await page.locator('[data-testid="source-detail-notification"]').waitFor({ timeout: 5_000 });

    // Verify via API
    const res = await request.get(`${API_BASE_URL}/favorites`, {
      headers: { "X-Session-Token": authToken },
    });
    expect(res.status()).toBe(200);
    const favorites = await res.json();
    expect(favorites.length).toBeGreaterThan(0);
    expect(favorites[0].note).toBe("Test note for API check");

    await page.close();
  });

  test.only("saving with type=phrase stores the correct type in API", async ({ browser, request }) => {
    const source = makeNoteSource("FavPhrase");
    source.content = "Break a leg is a common theatrical idiom for good luck.";
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdSourceId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdSourceId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);
    await page.click('[data-testid="selection-bubble-save-btn"]');
    await page.locator('[data-testid="source-detail-favorite-modal"]').waitFor();

    // Select "phrase" type
    await page.click('[data-testid="source-detail-favorite-type-phrase"]');
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await page.locator('[data-testid="source-detail-notification"]').waitFor({ timeout: 5_000 });

    const res = await request.get(`${API_BASE_URL}/favorites`, {
      headers: { "X-Session-Token": authToken },
    });
    const favorites = await res.json();
    const saved = favorites.find((f) => f.type === "phrase");
    expect(saved).toBeTruthy();
    expect(saved.type).toBe("phrase");

    await page.close();
  });

  // ── Cancel flow ────────────────────────────────────────────────────────────

  test("cancelling the modal does not create a favorite", async ({ browser, request }) => {
    const source = makeNoteSource("FavCancel");
    source.content = "This text will not be saved to favorites after cancellation.";
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdSourceId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdSourceId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    // Get count before
    const beforeRes = await request.get(`${API_BASE_URL}/favorites`, {
      headers: { "X-Session-Token": authToken },
    });
    const countBefore = (await beforeRes.json()).length;

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);
    await page.click('[data-testid="selection-bubble-save-btn"]');
    await page.locator('[data-testid="source-detail-favorite-modal"]').waitFor();

    // Click Cancel
    await page.locator('.ant-modal-footer .ant-btn:not(.ant-btn-primary)').click();
    await expect(
      page.locator('[data-testid="source-detail-favorite-modal"]')
    ).toBeHidden({ timeout: 3_000 });

    // Verify count unchanged
    const afterRes = await request.get(`${API_BASE_URL}/favorites`, {
      headers: { "X-Session-Token": authToken },
    });
    const countAfter = (await afterRes.json()).length;
    expect(countAfter).toBe(countBefore);

    await page.close();
  });

  // ── Reopen resets form ─────────────────────────────────────────────────────

  test("reopening the modal resets the type to word and clears the note", async ({
    browser,
    request,
  }) => {
    const source = makeNoteSource("FavReset");
    source.content = "Modal reset between opens should clear type and note fields.";
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdSourceId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdSourceId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    // Open, fill, cancel
    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);
    await page.click('[data-testid="selection-bubble-save-btn"]');
    await page.locator('[data-testid="source-detail-favorite-modal"]').waitFor();
    await page.click('[data-testid="source-detail-favorite-type-idiom"]');
    await page.fill('[data-testid="source-detail-favorite-note-input"]', "My note");
    await page.locator('.ant-modal-footer .ant-btn:not(.ant-btn-primary)').click();

    // Reopen
    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);
    await page.click('[data-testid="selection-bubble-save-btn"]');
    await page.locator('[data-testid="source-detail-favorite-modal"]').waitFor();

    // Type should reset to "word", note should be empty
    await expect(
      page.locator('[data-testid="source-detail-favorite-type-word"]')
    ).toHaveClass(/checked/);

    const noteValue = await page
      .locator('[data-testid="source-detail-favorite-note-input"]')
      .inputValue();
    expect(noteValue).toBe("");

    await page.close();
  });
});