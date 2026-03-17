import { expect } from '@playwright/test';

/**
 * Creates a new browser context and page with an authenticated session.
 * The session token is injected directly into localStorage before navigation.
 *
 * @param {Browser} browser - Playwright browser instance
 * @param {string} token - Session token obtained from login API
 * @param {string} targetUrl - Full URL of the page to visit (e.g., quiz view)
 * @returns {Promise<Page>} - Authenticated Playwright page object
 */
export async function createAuthenticatedPage(browser, token, targetUrl) {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Inject token into localStorage before the page loads
  await page.addInitScript((sessionToken) => {
    localStorage.setItem('session_token', sessionToken);
  }, token);

  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  return page;
}

/**
 * Adds a top-level comment on the quiz view page.
 * Assumes the page is already on the quiz view.
 *
 * @param {Page} page - Playwright page object
 * @param {string} content - Comment text
 */
export async function addComment(page, content) {
  await page.fill('[data-testid="new-comment-input"]', content);
  await page.click('[data-testid="submit-comment-button"]');
  // Wait for the comment to appear
  await expect(page.locator(`text=${content}`).first()).toBeVisible({ timeout: 5000 });
}

/**
 * Adds a reply to a specific comment.
 *
 * @param {Page} page - Playwright page object
 * @param {string|number} parentCommentId - Numeric ID of the parent comment
 * @param {string} content - Reply text
 */
export async function addReply(page, parentCommentId, content) {
  // Click the reply button on the parent comment
  await page.click(`[data-testid="comment-${parentCommentId}"] [data-testid="reply-button"]`);

  // Wait for reply modal to appear
  await expect(page.locator('[data-testid="reply-modal"]')).toBeVisible();

  // Fill reply content
  await page.fill('[data-testid="reply-input"]', content);

  // Submit reply
  await page.click('[data-testid="reply-modal-ok"]');

  // Wait for modal to disappear
  await expect(page.locator('[data-testid="reply-modal"]')).not.toBeVisible();

  // Wait for the reply to appear in the list
  await expect(page.locator(`text=${content}`).first()).toBeVisible({ timeout: 5000 });
}

/**
 * Edits a comment.
 *
 * @param {Page} page - Playwright page object
 * @param {string|number} commentId - Numeric ID of the comment to edit
 * @param {string} newContent - New comment text
 */
export async function editComment(page, commentId, newContent) {
  const commentLocator = page.locator(`[data-testid="comment-${commentId}"]`);

  // Click edit button
  await commentLocator.locator('[data-testid="edit-button"]').click();

  // Wait for edit textarea to appear
  await expect(commentLocator.locator('[data-testid="edit-comment-input"]')).toBeVisible();

  // Fill new content
  await commentLocator.locator('[data-testid="edit-comment-input"]').fill(newContent);

  // Click save
  await commentLocator.locator('[data-testid="save-edit-button"]').click();

  // Wait for edit mode to close and new content to appear
  await expect(commentLocator.locator(`text=${newContent}`)).toBeVisible();
}

/**
 * Deletes a comment.
 *
 * @param {Page} page - Playwright page object
 * @param {string|number} commentId - Numeric ID of the comment to delete
 */
export async function deleteComment(page, commentId) {
  const commentLocator = page.locator(`[data-testid="comment-${commentId}"]`);

  // Click delete button
  await commentLocator.locator('[data-testid="delete-button"]').click();

  // Wait for popconfirm and click Yes
  const popconfirm = page.locator('.ant-popconfirm');
  await expect(popconfirm).toBeVisible();
  await popconfirm.locator('.ant-btn-primary').click();

  // Wait for comment to disappear
  await expect(commentLocator).not.toBeVisible({ timeout: 5000 });
}

/**
 * Returns the locator for a comment by its ID.
 *
 * @param {Page} page - Playwright page object
 * @param {string|number} commentId - Numeric ID of the comment
 * @returns {Locator} - Playwright locator for the comment element
 */
export function getCommentLocator(page, commentId) {
  return page.locator(`[data-testid="comment-${commentId}"]`);
}