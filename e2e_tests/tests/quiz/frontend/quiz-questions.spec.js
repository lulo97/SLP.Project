import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  API_BASE_URL,
  generateUniqueName,
  loginAsAdmin,
  createAuthenticatedPage,
  createQuiz,
  deleteQuizViaApi,
  addQuestionToQuiz,
} from './quiz-test-utils';

test.describe('Quiz Questions', () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  test('Add, edit, and delete a question', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id } = await createQuiz(page);

    const questionTitle = await addQuestionToQuiz(page, 'multiple_choice');

    const questionItem = page.locator(`.ant-list-item:has-text("${questionTitle}")`);
    const testId = await questionItem.getAttribute('data-testid');
    const questionId = testId.replace('question-item-', '');

    // Edit
    await page.click(`[data-testid="edit-question-${questionId}"]`);
    await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'visible' });

    const editedTitle = `${questionTitle} EDITED`;
    await page.fill('[data-testid="question-title"]', editedTitle);
    await page.click('[data-testid="submit-question"]');
    await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'hidden' });

    await expect(page.locator(`.ant-list-item:has-text("${editedTitle}")`)).toBeVisible();

    // Delete
    await page.click(`[data-testid="delete-question-${questionId}"]`);
    await expect(page.locator('.ant-message-success:has-text("Question deleted")')).toBeVisible();
    await expect(page.locator(`.ant-list-item:has-text("${editedTitle}")`)).not.toBeVisible();

    // API check – FIXED: Use X-Session-Token
    const questionsResponse = await request.get(`${API_BASE_URL}/quiz/${id}/questions`, {
      headers: { 'X-Session-Token': authToken },
    });
    expect(questionsResponse.status()).toBe(200);
    const questions = await questionsResponse.json();
    expect(questions.find(q => q.id === parseInt(questionId))).toBeUndefined();

    await deleteQuizViaApi(request, authToken, id);
    await page.close();
  });

  test('Insert a question between existing questions', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id } = await createQuiz(page);

    const title1 = await addQuestionToQuiz(page, 'multiple_choice');
    const title2 = await addQuestionToQuiz(page, 'multiple_choice');

    const firstItem = page.locator(`.ant-list-item:has-text("${title1}")`);
    const firstTestId = await firstItem.getAttribute('data-testid');
    const firstId = firstTestId.replace('question-item-', '');

    await page.click(`[data-testid="insert-question-after-${firstId}"]`);
    await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'visible' });

    const insertedTitle = generateUniqueName('Inserted');
    await page.fill('[data-testid="question-title"]', insertedTitle);
    await page.fill('[data-testid="question-description"]', 'Inserted question');
    // Use True/False for simplicity
    await page.click('[data-testid="question-type"]');
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await page.click('.ant-select-dropdown .ant-select-item-option:has-text("True/False")');
    try {
      await page.waitForSelector('.ant-select-dropdown', { state: 'hidden', timeout: 2000 });
    } catch {
      await page.keyboard.press('Escape');
    }
    await page.click('[data-testid="true-false-true"]');
    await page.click('[data-testid="submit-question"]');
    await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'hidden' });

    await expect(page.locator(`.ant-list-item:has-text("${insertedTitle}")`)).toBeVisible();

    const allTitles = await page.locator('.ant-list-item .font-medium').allTextContents();
    const idx1 = allTitles.findIndex(t => t.includes(title1));
    const idxInserted = allTitles.findIndex(t => t.includes(insertedTitle));
    const idx2 = allTitles.findIndex(t => t.includes(title2));
    expect(idx1).toBeLessThan(idxInserted);
    expect(idxInserted).toBeLessThan(idx2);

    await deleteQuizViaApi(request, authToken, id);
    await page.close();
  });
});