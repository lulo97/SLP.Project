import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToNotes,
  createNoteViaUI,
  deleteNoteViaUI,
  searchForNote,
} from './noteHelper';

test.describe('Note CRUD via UI', () => {
  test('should create a note, search for it, and delete it', async ({ page }) => {
    // 1. Login and go to notes list
    await loginAsAdmin(page);
    await navigateToNotes(page);

    // 2. Create a note
    const uniqueTitle = `Test Note ${Date.now()}`;
    const uniqueContent = 'This note was created by Playwright.';

    const { noteId } = await createNoteViaUI(page, uniqueTitle, uniqueContent);

    // 3. Delete the note
    await deleteNoteViaUI(page, noteId);

    // 4. Verify it's no longer present
    await searchForNote(page, uniqueTitle);
    const noteCard = page
      .locator('.ant-card[data-testid^="note-card-"]')
      .filter({ hasText: uniqueTitle })
      .first();
    await expect(noteCard).not.toBeVisible();
  });
});