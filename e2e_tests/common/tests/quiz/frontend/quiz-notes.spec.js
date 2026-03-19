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
    await page.waitForSelector('.ant-modal-content', { state: 'visible' });

    const noteTitle = generateUniqueName('Note');
    const noteContent = 'Test content';
    await page.fill('[data-testid="note-title-input"]', noteTitle);
    await page.fill('[data-testid="note-content-input"]', noteContent);
    await page.click('[data-testid="add-note-submit"]');

    await page.waitForSelector('.ant-modal-content', { state: 'hidden' });

    // Find the note via its title and get its ID from the delete button's testid
    const deleteButton = page.locator(`[data-testid^="delete-note-"]`).first();
    await expect(deleteButton).toBeVisible();
    const deleteButtonTestId = await deleteButton.getAttribute('data-testid');
    const noteId = deleteButtonTestId.replace('delete-note-', '');

    // Verify note content is visible
    await expect(page.locator(`text=${noteTitle}`)).toBeVisible();

    // Delete note
    await deleteButton.click();
    await expect(page.locator(`text=${noteTitle}`)).not.toBeVisible();

    // API check
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