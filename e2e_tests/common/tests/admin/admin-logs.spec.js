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
  deleteUser,
  createAuthenticatedPage,
} from './admin-helpers.js';

test.describe('Admin Logs', () => {
  let adminToken;
  let testUserData;
  let createdUser;
  let userToken;
  let quiz;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAsAdmin(request);
  });

  test.beforeEach(async ({ request }) => {
    testUserData = generateUser();
    createdUser = await registerUser(request, testUserData);
    userToken = await login(request, testUserData.username, testUserData.password);
    quiz = await createQuiz(request, userToken, `Log Test Quiz ${Date.now()}`);
  });

  test.afterEach(async ({ request }) => {
    await deleteUser(request, adminToken, createdUser.id);
  });

  test('logs are recorded after admin actions', async ({ browser, request }) => {
    // Perform admin actions
    await request.post(`${API_BASE_URL}/admin/users/${createdUser.id}/ban`, {
      headers: { 'X-Session-Token': adminToken },
    });
    await request.post(`${API_BASE_URL}/admin/users/${createdUser.id}/unban`, {
      headers: { 'X-Session-Token': adminToken },
    });
    await request.post(`${API_BASE_URL}/admin/quizzes/${quiz.id}/disable`, {
      headers: { 'X-Session-Token': adminToken },
    });
    await request.post(`${API_BASE_URL}/admin/quizzes/${quiz.id}/enable`, {
      headers: { 'X-Session-Token': adminToken },
    });

    const page = await createAuthenticatedPage(browser, adminToken);

    // Switch to Logs tab
    await page.click('[data-testid="admin-tab-logs"]');
    await expect(page.locator('[data-testid="admin-logs-panel"] .ant-table')).toBeVisible();

    // Check that logs contain our actions with exact matching
    const actions = [
      { action: 'ban_user', targetId: createdUser.id },
      { action: 'unban_user', targetId: createdUser.id },
      { action: 'disable_quiz', targetId: quiz.id },
      { action: 'enable_quiz', targetId: quiz.id },
    ];

    for (const { action, targetId } of actions) {
      // Find row that:
      // 1. Contains an <a-tag> with the exact action text (regex ensures exact match)
      // 2. Contains the target ID somewhere in the row
      const logRow = page
        .locator('.ant-table-row')
        .filter({ has: page.locator('.ant-tag', { hasText: new RegExp(`^${action}$`) }) })
        .filter({ hasText: targetId.toString() });

      await expect(logRow).toBeVisible({ timeout: 5000 });
      
      // Optionally verify target ID appears (already covered by filter)
      await expect(logRow.locator(`text=${targetId}`)).toBeVisible();
    }
  });
});