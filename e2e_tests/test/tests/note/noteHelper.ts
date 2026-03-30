import { Page, Locator, expect, request } from '@playwright/test';

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3009';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3008';

// ----------------------------------------------------------------------
// API Helpers (unchanged)
// ----------------------------------------------------------------------

export async function loginAsAdmin(page: Page): Promise<string> {
  await page.goto(FRONTEND_URL);
  await page.getByPlaceholder('Enter your username').fill('admin');
  await page.getByPlaceholder('Enter your password').fill('123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`${FRONTEND_URL}/dashboard`);

  const token = await page.evaluate(() => localStorage.getItem('session_token'));
  if (!token) throw new Error('Failed to retrieve session token');
  return token;
}

export async function createNoteViaAPI(token: string, title: string, content: string): Promise<number> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  const response = await context.post(`${BACKEND_URL}/api/notes`, {
    headers: {
      'X-Session-Token': token,
      'Content-Type': 'application/json',
    },
    data: { title, content },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create note: ${response.status()} ${await response.text()}`);
  }
  const note = await response.json();
  return note.id;
}

export async function deleteNoteViaAPI(token: string, noteId: number): Promise<void> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  const response = await context.delete(`${BACKEND_URL}/api/notes/${noteId}`, {
    headers: { 'X-Session-Token': token },
  });
  if (!response.ok()) {
    throw new Error(`Failed to delete note: ${response.status()} ${await response.text()}`);
  }
}

// ----------------------------------------------------------------------
// UI Helpers
// ----------------------------------------------------------------------

export async function navigateToNotes(page: Page): Promise<void> {
  await page.goto(`${FRONTEND_URL}/notes`);
  await expect(page.getByTestId('notes-list-container')).toBeVisible();
}

export async function waitForLoadingSpinnerToHide(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="list-loading-spinner"] .ant-spin-spinning', {
    state: 'hidden',
    timeout: 5000,
  });
}

export async function searchForNote(page: Page, title: string): Promise<void> {
  const searchInput = page.getByTestId('note-search-input');
  await searchInput.fill(title);
  await searchInput.press('Enter');
  await waitForLoadingSpinnerToHide(page);
}

export async function getNoteCardByTitle(page: Page, title: string): Promise<Locator> {
  const card = page
    .locator('.ant-card[data-testid^="note-card-"]')
    .filter({ hasText: title })
    .first();
  await expect(card).toBeVisible();
  return card;
}

export async function extractNoteIdFromCard(card: Locator): Promise<string> {
  const testId = await card.getAttribute('data-testid');
  const noteId = testId?.match(/note-card-(\d+)/)?.[1];
  if (!noteId) throw new Error('Could not extract note ID from card');
  return noteId;
}

export async function fillNoteForm(page: Page, title: string, content: string): Promise<void> {
  await page.getByTestId('note-title-input').fill(title);
  await page.getByTestId('note-content-textarea').fill(content);
}

export async function submitNoteForm(page: Page): Promise<void> {
  await page.getByTestId('submit-form-button').click();
  await page.waitForURL(`${FRONTEND_URL}/notes`);
  await expect(page.getByTestId('notes-list-container')).toBeVisible();
}

export async function createNoteViaUI(page: Page, title: string, content: string): Promise<{ noteId: string; card: Locator }> {
  await page.getByTestId('create-note-button').click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/notes/new`);

  await fillNoteForm(page, title, content);
  await submitNoteForm(page);

  await searchForNote(page, title);
  const card = await getNoteCardByTitle(page, title);
  const noteId = await extractNoteIdFromCard(card);

  return { noteId, card };
}

export async function openNoteEditPage(page: Page, noteId: string): Promise<void> {
  const editIcon = page.getByTestId(`edit-note-icon-${noteId}`);
  await editIcon.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/notes/${noteId}/edit`);
  await expect(page.getByTestId('note-form-layout')).toBeVisible();
}

export async function verifyNoteFormValues(page: Page, expectedTitle: string, expectedContent: string): Promise<void> {
  await expect(page.getByTestId('note-title-input')).toHaveValue(expectedTitle);
  await expect(page.getByTestId('note-content-textarea')).toHaveValue(expectedContent);
}

export async function deleteNoteViaUI(page: Page, noteId: string): Promise<void> {
  const deleteIcon = page.getByTestId(`delete-note-icon-${noteId}`);
  await deleteIcon.click();
  await page.getByRole('button', { name: 'Yes' }).click();

  const successMessage = page.getByText('Note deleted successfully!');
  await expect(successMessage).toBeVisible();
}