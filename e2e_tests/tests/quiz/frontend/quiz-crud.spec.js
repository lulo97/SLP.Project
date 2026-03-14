import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  API_BASE_URL,
  adminUser,
  generateUniqueName,
  loginAsAdmin,
  createAuthenticatedPage,
  createQuiz,
  deleteQuizViaApi,
} from './quiz-test-utils';

test.describe('Quiz CRUD', () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  test('Create a quiz with minimal fields', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id, title } = await createQuiz(page);

    await expect(page.locator('[data-testid="quiz-title"]')).toHaveText(title);
    await expect(page.locator('[data-testid="quiz-description"]')).toHaveText(`Description for ${title}`);
    await expect(page.locator('[data-testid="quiz-visibility"]')).toHaveText('public');

    // Verify in list
    await page.goto(`${FRONTEND_URL}/quiz`);
    await expect(page.locator(`[data-testid="quiz-list-item-${id}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="quiz-title-link-${id}"]`)).toHaveText(title);

    await deleteQuizViaApi(request, authToken, id);
    await page.close();
  });

  test('Edit a quiz', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id, title } = await createQuiz(page);

    await page.click('[data-testid="edit-quiz-button"]');
    await page.waitForURL(`**/quiz/${id}/edit`);

    const newTitle = `${title} EDITED`;
    await page.fill('[data-testid="quiz-title-input"]', newTitle);
    await page.click('[data-testid="quiz-submit-button"]');
    await page.waitForURL(`**/quiz/${id}`);

    await expect(page.locator('[data-testid="quiz-title"]')).toHaveText(newTitle);

    await deleteQuizViaApi(request, authToken, id);
    await page.close();
  });

  test('Duplicate a quiz', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id, title } = await createQuiz(page);

    await page.click('[data-testid="duplicate-quiz-button"]');
    await expect(page.locator('.ant-message-success:has-text("Quiz duplicated")')).toBeVisible();
    await page.waitForURL(/\/quiz\/\d+\/edit$/);
    const duplicatedUrl = page.url();
    const duplicatedId = parseInt(duplicatedUrl.split('/').slice(-2, -1)[0], 10);

    await page.goto(`${FRONTEND_URL}/quiz/${duplicatedId}`);
    await expect(page.locator('[data-testid="quiz-title"]')).toHaveText(title);

    await deleteQuizViaApi(request, authToken, id);
    await deleteQuizViaApi(request, authToken, duplicatedId);
    await page.close();
  });

  test('Delete a quiz', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id } = await createQuiz(page);

    await page.click('[data-testid="delete-quiz-button"]');
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');
    await expect(page.locator('.ant-message-success:has-text("Quiz deleted")')).toBeVisible();
    await page.waitForURL('**/quiz');

    await expect(page.locator(`[data-testid="quiz-list-item-${id}"]`)).not.toBeVisible();

    // API check
    const response = await request.get(`${API_BASE_URL}/quiz/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status()).toBe(404);

    await page.close();
  });
});