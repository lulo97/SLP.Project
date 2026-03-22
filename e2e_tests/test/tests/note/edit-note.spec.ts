import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToNotes,
  createNoteViaUI,
  deleteNoteViaUI,
  searchForNote,
  getNoteCardByTitle,
  openNoteEditPage,
  verifyNoteFormValues,
  fillNoteForm,
  submitNoteForm,
} from './noteHelper'; // adjust path as needed

test.describe('Note Edit and Delete via UI', () => {
  test('should create a note, edit its title and content, and delete it', async ({ page }) => {
    // 1. Login and go to notes list
    await loginAsAdmin(page);
    await navigateToNotes(page);

    // 2. Create a note with original values
    const originalTitle = `Original Note ${Date.now()}`;
    const originalContent = 'This is the original content.';
    const editedTitle = `${originalTitle} (edited)`;
    const editedContent = 'This content has been updated.';

    const { noteId } = await createNoteViaUI(page, originalTitle, originalContent);

    // 3. Open edit page and verify pre-filled values
    await openNoteEditPage(page, noteId);
    await verifyNoteFormValues(page, originalTitle, originalContent);

    // 4. Edit the note and submit
    await fillNoteForm(page, editedTitle, editedContent);
    await submitNoteForm(page);

    // 5. Verify the updated note appears with edited content
    await searchForNote(page, editedTitle);
    const updatedCard = await getNoteCardByTitle(page, editedTitle);
    const excerpt = updatedCard.locator('[data-testid^="note-card-excerpt-"]');
    await expect(excerpt).toContainText(editedContent);

    // 6. Delete the note
    await deleteNoteViaUI(page, noteId);

    // 7. Ensure it's gone
    await searchForNote(page, editedTitle);
    await expect(updatedCard).not.toBeVisible();
  });
});