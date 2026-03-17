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
    // Perform some admin actions via API to generate logs
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
    // Wait for the logs panel and its table to be visible
    await expect(page.locator('[data-testid="admin-logs-panel"] .ant-table')).toBeVisible();

    // Wait a moment for logs to load
    await page.waitForTimeout(1000);

    // Check that logs contain our actions
    const actions = [
      { action: 'ban_user', targetId: createdUser.id },
      { action: 'unban_user', targetId: createdUser.id },
      { action: 'disable_quiz', targetId: quiz.id },
      { action: 'enable_quiz', targetId: quiz.id },
    ];

    for (const { action, targetId } of actions) {
      const logRow = page.locator(`.ant-table-row:has-text("${action}")`);
      await expect(logRow).toBeVisible();
      // Optionally verify target ID appears
      await expect(logRow.locator(`text=${targetId}`)).toBeVisible();
    }
  });
});