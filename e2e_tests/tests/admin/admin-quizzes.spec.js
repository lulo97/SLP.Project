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

test.describe('Admin Quizzes', () => {
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
    quiz = await createQuiz(request, userToken, `Admin Test Quiz ${Date.now()}`);
  });

  test.afterEach(async ({ request }) => {
    await deleteUser(request, adminToken, createdUser.id);
  });

  test('disable and enable quiz', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, adminToken);

    // Switch to Quizzes tab
    await page.click('[data-testid="admin-tab-quizzes"]');
    await expect(page.locator('[data-testid="admin-quizzes-search"]')).toBeVisible();

    // Wait for quiz to appear
    await expect(page.locator(`text=${quiz.title}`)).toBeVisible();

    // Click Disable button
    await page.click(`[data-testid="admin-quiz-disable-${quiz.id}"]`);
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');
    await expect(page.locator('.ant-message-success:has-text("Quiz disabled")')).toBeVisible();

    // Verify disabled status in table
    const disabledTag = page.locator(`.ant-table-row:has-text("${quiz.title}") .ant-tag:has-text("Disabled")`);
    await expect(disabledTag).toBeVisible();

    // Click Enable button
    await page.click(`[data-testid="admin-quiz-enable-${quiz.id}"]`);
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');
    await expect(page.locator('.ant-message-success:has-text("Quiz enabled")')).toBeVisible();

    // Verify enabled status
    const enabledTag = page.locator(`.ant-table-row:has-text("${quiz.title}") .ant-tag:has-text("Enabled")`);
    await expect(enabledTag).toBeVisible();
  });

  test('search quizzes', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, adminToken);

    await page.click('[data-testid="admin-tab-quizzes"]');
    await expect(page.locator('[data-testid="admin-quizzes-search"]')).toBeVisible();

    await expect(page.locator(`text=${quiz.title}`)).toBeVisible();

    // Search by quiz title
    await page.fill('[data-testid="admin-quizzes-search"]', quiz.title);
    await page.keyboard.press('Enter');

    // Should see only the test quiz
    await expect(page.locator(`text=${quiz.title}`)).toBeVisible();
    const rows = await page.locator('.ant-table-row').count();
    expect(rows).toBe(1);
  });
});