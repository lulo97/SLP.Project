import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  API_BASE_URL,
  ADMIN_USER,
  generateUser,
  registerUser,
  login,
  loginAsAdmin,
  createQuiz,
  createComment,
  deleteUser,
  createAuthenticatedPage,
} from './admin-helpers.js';

test.describe('Admin Comments', () => {
  let adminToken;
  let testUserData;
  let createdUser;
  let userToken;
  let quiz;
  let comment;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAsAdmin(request);
  });

  test.beforeEach(async ({ request }) => {
    testUserData = generateUser();
    createdUser = await registerUser(request, testUserData);
    userToken = await login(request, testUserData.username, testUserData.password);
    quiz = await createQuiz(request, userToken, `Comment Test Quiz ${Date.now()}`);
    comment = await createComment(request, userToken, 'quiz', quiz.id, `Test comment ${Date.now()}`);
  });

  test.afterEach(async ({ request }) => {
    await deleteUser(request, adminToken, createdUser.id);
  });

  test('delete and restore comment', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, adminToken);

    // Switch to Comments tab
    await page.click('[data-testid="admin-tab-comments"]');
    await expect(page.locator('[data-testid="admin-comments-show-deleted"]')).toBeVisible();

    // Wait for comment to appear
    await expect(page.locator(`text=${comment.content}`)).toBeVisible();

    // Delete comment
    await page.click(`[data-testid="admin-comment-delete-${comment.id}"]`);
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');
    await expect(page.locator('.ant-message-success:has-text("Comment deleted")')).toBeVisible();

    // The comment should now have a "Deleted" tag and a "Restore" button
    // Show deleted comments (checkbox)
    await page.check('[data-testid="admin-comments-show-deleted"]');
    await page.click('[data-testid="admin-comments-refresh"]');

    // Wait for the comment to appear (now with Deleted tag)
    await expect(page.locator(`text=${comment.content}`)).toBeVisible();
    const deletedTag = page.locator(`.ant-table-row:has-text("${comment.content}") .ant-tag:has-text("Deleted")`);
    await expect(deletedTag).toBeVisible();

    // Restore comment
    await page.click(`[data-testid="admin-comment-restore-${comment.id}"]`);
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');
    await expect(page.locator('.ant-message-success:has-text("Comment restored")')).toBeVisible();

    // Comment should now be active (no Deleted tag)
    // Hide deleted comments
    await page.uncheck('[data-testid="admin-comments-show-deleted"]');
    await page.click('[data-testid="admin-comments-refresh"]');
    await expect(page.locator(`text=${comment.content}`)).toBeVisible();
    const activeTag = page.locator(`.ant-table-row:has-text("${comment.content}") .ant-tag:has-text("Active")`);
    await expect(activeTag).toBeVisible();
  });
});