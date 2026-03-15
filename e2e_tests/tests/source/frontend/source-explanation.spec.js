// source-explanation.spec.js – selection bubble and explanation panel tests

import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  authenticate,
  createAuthenticatedPage,
  createNoteSourceViaApi,
  deleteSourceViaApi,
  goToSourceDetail,
  selectTextInArticle,
  clearSelection,
  makeNoteSource,
} from "./source-helpers.js";

test.describe("Source – Selection Bubble & Explanation Panel", () => {
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

  // ── Selection bubble appearance ────────────────────────────────────────────

  test("bubble appears when text is selected inside article", async ({ browser, request }) => {
    const source = makeNoteSource("BubbleShow");
    source.content = "The quick brown fox jumps over the lazy dog. More text here.";
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await page.waitForTimeout(200); // or use page.waitForFunction to detect bubble

    const text = await page.locator('[data-testid="source-detail-content-plain"]').textContent();
    console.log('Element text:', text);

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    console.log('Selected text:', selectedText);

    await expect(page.locator('[data-testid="selection-bubble"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-bubble-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-bubble-explain-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-bubble-grammar-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-bubble-listen-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-bubble-save-btn"]')).toBeVisible();

    await page.close();
  });

  test("bubble hides when Escape is pressed", async ({ browser, request }) => {
    const source = makeNoteSource("BubbleEsc");
    source.content = "Text for escape key test. Lorem ipsum dolor sit amet.";
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);
    await expect(page.locator('[data-testid="selection-bubble"]')).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="selection-bubble"]')).toBeHidden({ timeout: 2_000 });

    await page.close();
  });

  test("bubble does not appear for selections outside the article", async ({ browser, request }) => {
    const source = makeNoteSource("BubbleOutside");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    // Select text in the header (outside article body)
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="source-detail-article-title"]');
      if (!el) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    // Bubble should NOT appear because title is not inside contentRef
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="selection-bubble"]')).toBeHidden();

    await page.close();
  });

  // ── Explanation panel toggle ───────────────────────────────────────────────

  test("explanations toggle button opens and closes the panel", async ({ browser, request }) => {
    const source = makeNoteSource("PanelToggle");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    // Panel starts closed
    await expect(page.locator('[data-testid="explanation-panel"]')).toHaveClass(/translate-x-full/);

    await page.click('[data-testid="source-detail-explanations-toggle-btn"]');
    await expect(page.locator('[data-testid="explanation-panel"]')).toHaveClass(/translate-x-0/);

    // Close via the X button inside the panel
    await page.click('[data-testid="explanation-panel-close-btn"]');
    await expect(page.locator('[data-testid="explanation-panel"]')).toHaveClass(/translate-x-full/);

    await page.close();
  });

  test("explanation panel shows empty state when no explanations exist", async ({
    browser,
    request,
  }) => {
    const source = makeNoteSource("PanelEmpty");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    await page.click('[data-testid="source-detail-explanations-toggle-btn"]');
    await page.locator('[data-testid="explanation-panel"]').waitFor();

    await expect(page.locator('[data-testid="explanation-panel-empty"]')).toBeVisible();

    await page.close();
  });

  // ── Explain action ─────────────────────────────────────────────────────────

  test("clicking Explain opens the panel with a pending preview", async ({
    browser,
    request,
  }) => {
    const source = makeNoteSource("ExplainAction");
    source.content = "Photosynthesis is the process by which plants convert sunlight into food.";
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 25);
    await page.click('[data-testid="selection-bubble-explain-btn"]');

    // Panel opens automatically
    await expect(page.locator('[data-testid="explanation-panel"]')).toHaveClass(/translate-x-0/);

    // Preview card should be visible with the selected text
    await expect(page.locator('[data-testid="explanation-panel-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="explanation-panel-preview-text"]')).not.toBeEmpty();

    await page.close();
  });

  test("clear button removes the pending preview", async ({ browser, request }) => {
    const source = makeNoteSource("ExplainClear");
    source.content = "Gravity is a fundamental force of attraction between masses.";
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 20);
    await page.click('[data-testid="selection-bubble-explain-btn"]');
    await page.locator('[data-testid="explanation-panel-preview"]').waitFor();

    await page.click('[data-testid="explanation-panel-clear-btn"]');
    await expect(page.locator('[data-testid="explanation-panel-preview"]')).toBeHidden();

    await page.close();
  });

  test.only("submitting explanation via AI adds an optimistic card to the list", async ({
    browser,
    request,
  }) => {
    const source = makeNoteSource("ExplainSubmit");
    source.content = "The mitochondria is the powerhouse of the cell. It produces ATP.";
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 30);
    await page.click('[data-testid="selection-bubble-explain-btn"]');
    await page.locator('[data-testid="explanation-panel-preview"]').waitFor();

    await page.click('[data-testid="explanation-panel-explain-btn"]');

    // Optimistic card should appear immediately in the list
    await expect(page.locator('[data-testid="explanation-panel-list"]')).toBeVisible({
      timeout: 5_000,
    });

    // At least one card in the list
    const cards = page.locator('[data-testid^="explanation-panel-card-"]');
    await expect(cards).toHaveCount(1, { timeout: 5_000 });

    // The badge count on the toggle button should update
    await expect(page.locator('[data-testid="source-detail-explanations-badge"]')).toBeVisible();

    await page.close();
  });

  test("explanations badge shows correct count", async ({ browser, request }) => {
    const source = makeNoteSource("ExplainBadge");
    source.content = "First sentence to explain. Second sentence also interesting.";
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    // Pre-create one explanation via API so the page loads with it
    await request.post(`${API_BASE_URL}/explanations`, {
      data:    { sourceId: createdId, textRange: { text: "First sentence" }, content: "An explanation" },
      headers: { "X-Session-Token": authToken },
    });

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    await expect(
      page.locator('[data-testid="source-detail-explanations-badge"]')
    ).toHaveText("1", { timeout: 5_000 });

    await page.close();
  });

  // ── Grammar / TTS queued notifications ────────────────────────────────────

  test("Grammar button triggers queued notification", async ({ browser, request }) => {
    const source = makeNoteSource("Grammar");
    source.content = "Grammar check me please.";
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 15);
    await page.click('[data-testid="selection-bubble-grammar-btn"]');

    await expect(page.locator('[data-testid="source-detail-notification"]')).toBeVisible({
      timeout: 4_000,
    });
    await expect(page.locator('[data-testid="source-detail-notification"]')).toContainText(
      "Grammar check queued"
    );

    await page.close();
  });

  test("Listen button triggers queued notification", async ({ browser, request }) => {
    const source = makeNoteSource("TTS");
    source.content = "Read this text aloud for me please.";
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await selectTextInArticle(page, '[data-testid="source-detail-content-plain"]', 15);
    await page.click('[data-testid="selection-bubble-listen-btn"]');

    await expect(page.locator('[data-testid="source-detail-notification"]')).toBeVisible({
      timeout: 4_000,
    });
    await expect(page.locator('[data-testid="source-detail-notification"]')).toContainText(
      "Text-to-speech queued"
    );

    await page.close();
  });
});