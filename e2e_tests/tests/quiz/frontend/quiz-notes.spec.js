import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  API_BASE_URL,
  generateUniqueName,
  loginAsAdmin,
  createAuthenticatedPage,
  createQuiz,
  deleteQuizViaApi,
} from './quiz-test-utils';

test.describe('Quiz Notes', () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  test('Add and remove a note', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id } = await createQuiz(page);

    await page.click('[data-testid="add-note-button"]');
    await page.waitForSelector('[data-testid="add-note-modal"]', { state: 'visible' });

    const noteTitle = generateUniqueName('Note');
    const noteContent = 'Test content';
    await page.fill('[data-testid="note-title-input"]', noteTitle);
    await page.fill('[data-testid="note-content-input"]', noteContent);
    await page.click('[data-testid="add-note-submit"]');

    const noteItem = page.locator(`.ant-card-body:has-text("${noteTitle}")`).first();
    await expect(noteItem).toBeVisible();
    const testId = await noteItem.getAttribute('data-testid');
    const noteId = testId.split('-').pop();

    await page.click(`[data-testid="delete-note-${noteId}"]`);
    await expect(noteItem).not.toBeVisible();

    // API check – FIXED: Use X-Session-Token
    const notesResponse = await request.get(`${API_BASE_URL}/quiz/${id}/notes`, {
      headers: { 'X-Session-Token': authToken },
    });
    expect(notesResponse.status()).toBe(200);
    const notes = await notesResponse.json();
    expect(notes.find(n => n.id === parseInt(noteId))).toBeUndefined();

    await deleteQuizViaApi(request, authToken, id);
    await page.close();
  });
});