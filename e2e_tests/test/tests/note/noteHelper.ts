import { Page, request } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000';
const BACKEND_URL = process.env.BACKEND_URL || 'https://localhost:7297';

/**
 * Log in as the admin user and return the session token.
 */
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

/**
 * Create a note via API and return its ID.
 */
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

/**
 * Delete a note via API.
 */
export async function deleteNoteViaAPI(token: string, noteId: number): Promise<void> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  const response = await context.delete(`${BACKEND_URL}/api/notes/${noteId}`, {
    headers: { 'X-Session-Token': token },
  });
  if (!response.ok()) {
    throw new Error(`Failed to delete note: ${response.status()} ${await response.text()}`);
  }
}