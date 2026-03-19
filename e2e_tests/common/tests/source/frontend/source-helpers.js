// ─────────────────────────────────────────────────────────────────────────────
// source-helpers.js  –  shared utilities for all source e2e tests
//
// Every helper is self-contained. Tests import exactly what they need.
// ─────────────────────────────────────────────────────────────────────────────

import { expect } from "@playwright/test";

export const FRONTEND_URL = "http://localhost:4000";
export const API_BASE_URL = "http://localhost:3001/api";

// ── Credentials ───────────────────────────────────────────────────────────────
export const adminUser = { username: "admin", password: "123" };

// ── Unique data generators ────────────────────────────────────────────────────
export function uid() {
  return `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

export function makeNoteSource(prefix = "Note") {
  const id = uid();
  return {
    title:   `${prefix} ${id}`,
    content: `Auto-generated content for ${prefix} ${id}. Testing 1 2 3.`,
  };
}

export function makeUrlSource(prefix = "URL") {
  const id = uid();
  return {
    title: `${prefix} ${id}`,
    url:   `https://example.com/test-${id}`,
  };
}

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * Logs in via the API and returns a session token.
 * Call once per test suite in beforeAll.
 */
export async function authenticate(request) {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username: adminUser.username, password: adminUser.password },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.token, "Login must return a token").toBeTruthy();
  return body.token;
}

// ── Page factory ──────────────────────────────────────────────────────────────

/**
 * Creates a new browser page with the session token injected into localStorage,
 * then navigates to /source and waits for the list to be visible.
 */
export async function createAuthenticatedPage(browser, token) {
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.addInitScript((t) => {
    localStorage.setItem("session_token", t);
  }, token);

  await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="source-list"]')).toBeVisible({ timeout: 10_000 });
  return page;
}

// ── API-level source helpers ──────────────────────────────────────────────────
// Use these for test setup/teardown so the UI tests stay focused on behaviour.

/**
 * Creates a note source via the API and returns the created SourceDto.
 */
export async function createNoteSourceViaApi(request, token, { title, content }) {
  const res = await request.post(`${API_BASE_URL}/source/note`, {
    data:    { title, content },
    headers: { "X-Session-Token": token },
  });
  expect(res.status(), `Create note source — expected 201, got ${res.status()}`).toBe(201);
  return res.json();
}

/**
 * Creates a URL source via the API and returns the created SourceDto.
 */
export async function createUrlSourceViaApi(request, token, { title, url }) {
  const res = await request.post(`${API_BASE_URL}/source/url`, {
    data:    { title, url },
    headers: { "X-Session-Token": token },
  });
  expect(res.status(), `Create URL source — expected 201, got ${res.status()}`).toBe(201);
  return res.json();
}

/**
 * Soft-deletes a source via the API. Silently ignores 404 (already gone).
 */
export async function deleteSourceViaApi(request, token, id) {
  if (!id) return;
  const res = await request.delete(`${API_BASE_URL}/source/${id}`, {
    headers: { "X-Session-Token": token },
  });
  // 204 = deleted, 404 = already gone — both are acceptable
  expect([204, 404]).toContain(res.status());
}

/**
 * Asserts that a source is no longer accessible via the API (soft-deleted).
 */
export async function assertSourceDeletedViaApi(request, token, id) {
  const res = await request.get(`${API_BASE_URL}/source/${id}`, {
    headers: { "X-Session-Token": token },
  });
  expect(res.status()).toBe(404);
}

// ── UI-level delete helper ────────────────────────────────────────────────────

/**
 * Deletes a source through the list page UI (popconfirm flow).
 * Leaves the page on /source after completion.
 */
export async function deleteSourceViaListUi(page, id) {
  await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
  await page.locator(`[data-testid="source-list-item-${id}"]`).waitFor({ timeout: 8_000 });
  await page.click(`[data-testid="source-list-delete-btn-${id}"]`);
  // Ant Design popconfirm — click the primary "Yes" button
  await page.locator(".ant-popconfirm-buttons .ant-btn-primary").click();
  await expect(
    page.locator('.ant-message-success:has-text("Source deleted")')
  ).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(`[data-testid="source-list-item-${id}"]`)).toHaveCount(0);
}

// ── Source detail navigation ──────────────────────────────────────────────────

/**
 * Navigates to /source/:id and waits until the article is fully rendered.
 */
export async function goToSourceDetail(page, id) {
  await page.goto(`${FRONTEND_URL}/source/${id}`, { waitUntil: "domcontentloaded" });
  // Wait for either article (success) or error state
  await page
    .locator('[data-testid="source-detail-article"], [data-testid="source-detail-error"]')
    .first()
    .waitFor({ timeout: 12_000 });
}

// ── Text selection helper ─────────────────────────────────────────────────────

/**
 * Programmatically selects the first `charCount` characters inside `selector`
 * using window.getSelection() / Range, then waits for the bubble to appear.
 */
export async function selectTextInArticle(page, selector, charCount = 30) {
  await page.evaluate(
    ({ sel, chars }) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element ${sel} not found`);

      // Collect all text nodes and their start offsets
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.trim().length > 0) {
          textNodes.push(node);
        }
      }
      if (textNodes.length === 0) return;

      // Determine which text node contains the Nth character
      let remaining = chars;
      let targetNode = null;
      let offset = 0;
      for (const node of textNodes) {
        const len = node.textContent.length;
        if (remaining <= len) {
          targetNode = node;
          offset = remaining;
          break;
        }
        remaining -= len;
      }
      if (!targetNode) {
        // Select all text
        targetNode = textNodes[textNodes.length - 1];
        offset = targetNode.textContent.length;
      }

      const range = document.createRange();
      range.setStart(targetNode, 0);
      range.setEnd(targetNode, offset);

      const sel2 = window.getSelection();
      sel2.removeAllRanges();
      sel2.addRange(range);

      // Dispatch both mouseup and selectionchange to be safe
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      document.dispatchEvent(new Event("selectionchange"));
    },
    { sel: selector, chars: charCount }
  );

  // Wait for bubble
  await page.locator('[data-testid="selection-bubble"]').waitFor({ timeout: 4_000 });
}

/**
 * Clears the current text selection and waits for the bubble to disappear.
 */
export async function clearSelection(page) {
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.locator('[data-testid="selection-bubble"]').waitFor({ state: "hidden", timeout: 3_000 });
}