// source-reading.spec.js – reading view UI: header, progress bar, font size, back nav

import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  API_BASE_URL,
  authenticate,
  createAuthenticatedPage,
  createNoteSourceViaApi,
  deleteSourceViaApi,
  goToSourceDetail,
  makeNoteSource,
} from "./source-helpers.js";

// Long enough content so there is something to scroll
function longContent(words = 300) {
  return Array.from(
    { length: words },
    (_, i) => `word${i} `
  ).join("") + " end of content.";
}

test.describe("Source – Reading View", () => {
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

  // ── Article rendering ──────────────────────────────────────────────────────

  test("renders article title, type badge, and stats", async ({ browser, request }) => {
    const source = makeNoteSource("ReadTest");
    source.content = longContent(250);
    const dto = await createNoteSourceViaApi(request, authToken, source);
    createdId = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    await expect(page.locator('[data-testid="source-detail-article-title"]')).toHaveText(source.title);
    await expect(page.locator('[data-testid="source-detail-type-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-article-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-word-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-read-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-content-plain"]')).toBeVisible();

    await page.close();
  });

  // ── Header controls ────────────────────────────────────────────────────────

  test("back button navigates to source list", async ({ browser, request }) => {
    const source = makeNoteSource("BackBtn");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    await page.click('[data-testid="source-detail-back-btn"]');
    await page.waitForURL(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="source-list"]')).toBeVisible();

    await page.close();
  });

  test("font size button cycles through three sizes", async ({ browser, request }) => {
    const source = makeNoteSource("FontSize");
    source.content = longContent(100);
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    const body = page.locator('[data-testid="source-detail-content-plain"]');

    // Initial size (index 1 = text-base)
    await expect(body).toHaveClass(/text-base/);

    // Click once → text-lg
    await page.click('[data-testid="source-detail-font-size-btn"]');
    await expect(body).toHaveClass(/text-lg/);

    // Click again → text-sm
    await page.click('[data-testid="source-detail-font-size-btn"]');
    await expect(body).toHaveClass(/text-sm/);

    // Click again → back to text-base
    await page.click('[data-testid="source-detail-font-size-btn"]');
    await expect(body).toHaveClass(/text-base/);

    await page.close();
  });

  test("font size change triggers info notification", async ({ browser, request }) => {
    const source = makeNoteSource("FontNotif");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    await page.click('[data-testid="source-detail-font-size-btn"]');

    await expect(page.locator('[data-testid="source-detail-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-detail-notification"]')).toContainText(
      "Font size changed"
    );
    await expect(page.locator('[data-testid="source-detail-notification"]')).toHaveAttribute(
      "data-notif-type",
      "info"
    );

    await page.close();
  });

  // ── Progress bar ───────────────────────────────────────────────────────────

  test("progress bar track is always visible", async ({ browser, request }) => {
    const source = makeNoteSource("ProgBar");
    const dto    = await createNoteSourceViaApi(request, authToken, source);
    createdId    = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);

    await expect(page.locator('[data-testid="reading-progress-bar-track"]')).toBeVisible();
    await expect(page.locator('[data-testid="reading-progress-bar-fill"]')).toBeVisible();

    await page.close();
  });

  test("scrolling increases the progress bar fill width", async ({ browser, request }) => {
    const source  = makeNoteSource("ProgScroll");
    source.content = longContent(600);
    const dto     = await createNoteSourceViaApi(request, authToken, source);
    createdId     = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    // Initial width should be near 0 %
    const initialWidth = await page
      .locator('[data-testid="reading-progress-bar-fill"]')
      .evaluate((el) => parseFloat(el.style.width) || 0);

    // Scroll to bottom of the main container
    await page.locator('[data-testid="source-detail-main"]').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    // Give the scroll handler time to update state
    await page.waitForTimeout(400);

    const afterWidth = await page
      .locator('[data-testid="reading-progress-bar-fill"]')
      .evaluate((el) => parseFloat(el.style.width) || 0);

    expect(afterWidth).toBeGreaterThan(initialWidth);

    await page.close();
  });

  // ── Progress persistence (save & restore) ─────────────────────────────────

  test("saves and restores scroll progress across page visits", async ({ browser, request }) => {
    const source  = makeNoteSource("ProgSave");
    source.content = longContent(600);
    const dto     = await createNoteSourceViaApi(request, authToken, source);
    createdId     = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    // Scroll halfway
    await page.locator('[data-testid="source-detail-main"]').evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });

    // Wait for debounced save (800 ms) + buffer
    await page.waitForTimeout(1_200);

    // Reload the page
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="source-detail-article"]').waitFor();

    // Resume toast should appear because saved position > 100 px
    await expect(page.locator('[data-testid="source-detail-resume-toast"]')).toBeVisible({
      timeout: 5_000,
    });

    // Resume button in header should be visible too
    await expect(page.locator('[data-testid="source-detail-resume-btn"]')).toBeVisible();

    await page.close();
  });

  test("dismiss button hides the resume toast", async ({ browser, request }) => {
    const source  = makeNoteSource("ToastDismiss");
    source.content = longContent(500);
    const dto     = await createNoteSourceViaApi(request, authToken, source);
    createdId     = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    // Save some progress
    await page.locator('[data-testid="source-detail-main"]').evaluate((el) => {
      el.scrollTop = el.scrollHeight / 3;
    });
    await page.waitForTimeout(1_200);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="source-detail-resume-toast"]').waitFor({ timeout: 5_000 });

    // Dismiss
    await page.click('[data-testid="source-detail-resume-toast-dismiss-btn"]');
    await expect(
      page.locator('[data-testid="source-detail-resume-toast"]')
    ).toBeHidden({ timeout: 3_000 });

    await page.close();
  });

  test("clicking the resume toast scrolls to saved position", async ({ browser, request }) => {
    const source  = makeNoteSource("ResumeScroll");
    source.content = longContent(800);
    const dto     = await createNoteSourceViaApi(request, authToken, source);
    createdId     = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    // Scroll to ~70 %
    await page.locator('[data-testid="source-detail-main"]').evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.7;
    });
    await page.waitForTimeout(1_200);
    await page.reload({ waitUntil: "domcontentloaded" });

    const toast = page.locator('[data-testid="source-detail-resume-toast"]');
    await toast.waitFor({ timeout: 5_000 });

    // Grab scroll position before clicking
    const beforeScroll = await page
      .locator('[data-testid="source-detail-main"]')
      .evaluate((el) => el.scrollTop);

    await toast.click();
    await page.waitForTimeout(600); // smooth scroll time

    const afterScroll = await page
      .locator('[data-testid="source-detail-main"]')
      .evaluate((el) => el.scrollTop);

    expect(afterScroll).toBeGreaterThan(beforeScroll);

    await page.close();
  });

  // ── Progress API verification ──────────────────────────────────────────────

  test("progress is persisted in the API after scrolling", async ({ browser, request }) => {
    const source  = makeNoteSource("ProgApi");
    source.content = longContent(500);
    const dto     = await createNoteSourceViaApi(request, authToken, source);
    createdId     = dto.id;

    const page = await createAuthenticatedPage(browser, authToken);
    await goToSourceDetail(page, createdId);
    await page.locator('[data-testid="source-detail-content-plain"]').waitFor();

    await page.locator('[data-testid="source-detail-main"]').evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.6;
    });
    // Wait for debounced save
    await page.waitForTimeout(1_200);

    // Check API directly
    const res = await request.get(`${API_BASE_URL}/source/${createdId}/progress`, {
      headers: { "X-Session-Token": authToken },
    });
    expect(res.status()).toBe(200);
    const progress = await res.json();
    expect(progress.scrollPosition).toBeGreaterThan(0);
    expect(progress.percentComplete).toBeGreaterThan(0);

    await page.close();
  });
});