import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test.describe('Note Edit and Delete via UI', () => {
  test('should create a note, edit its title and content, and delete it', async ({ page }) => {
    // 1. Login as admin
    await page.goto(BASE_URL);
    await page.getByPlaceholder('Enter your username').fill('admin');
    await page.getByPlaceholder('Enter your password').fill('123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);

    // 2. Navigate to notes list
    await page.goto(`${BASE_URL}/notes`);
    await expect(page.getByTestId('notes-list-container')).toBeVisible();

    // 3. Click "Create Note" button
    await page.getByTestId('create-note-button').click();
    await expect(page).toHaveURL(`${BASE_URL}/notes/new`);

    // 4. Fill the form with original values
    const originalTitle = `Original Note ${Date.now()}`;
    const originalContent = 'This is the original content.';
    const editedTitle = `${originalTitle} (edited)`;
    const editedContent = 'This content has been updated.';

    await page.getByTestId('note-title-input').fill(originalTitle);
    await page.getByTestId('note-content-textarea').fill(originalContent);

    // 5. Submit the form
    await page.getByTestId('submit-form-button').click();

    // 6. Wait for redirection to the notes list page
    await page.waitForURL(`${BASE_URL}/notes`);
    await expect(page.getByTestId('notes-list-container')).toBeVisible();

    // 7. Search for the note by original title
    const searchInput = page.getByTestId('note-search-input');
    await searchInput.fill(originalTitle);
    await searchInput.press('Enter');

    // Wait for loading to finish
    await page.waitForSelector('[data-testid="list-loading-spinner"] .ant-spin-spinning', {
      state: 'hidden',
      timeout: 5000,
    });

    // 8. Find the note card and extract its ID
    const noteCard = page
      .locator('.ant-card[data-testid^="note-card-"]')
      .filter({ hasText: originalTitle })
      .first();
    await expect(noteCard).toBeVisible();

    const testId = await noteCard.getAttribute('data-testid');
    const noteId = testId?.match(/note-card-(\d+)/)?.[1];
    expect(noteId).toBeDefined();

    // 9. Click the edit icon on the card
    const editIcon = page.getByTestId(`edit-note-icon-${noteId}`);
    await editIcon.click();

    // 10. Wait for the edit page to load
    await expect(page).toHaveURL(`${BASE_URL}/notes/${noteId}/edit`);
    await expect(page.getByTestId('note-form-layout')).toBeVisible();

    // 11. Verify that the form is pre-filled with original values
    await expect(page.getByTestId('note-title-input')).toHaveValue(originalTitle);
    await expect(page.getByTestId('note-content-textarea')).toHaveValue(originalContent);

    // 12. Modify title and content
    await page.getByTestId('note-title-input').fill(editedTitle);
    await page.getByTestId('note-content-textarea').fill(editedContent);

    // 13. Submit the edit form
    await page.getByTestId('submit-form-button').click();

    // 14. After update, we should be redirected back to the notes list
    await page.waitForURL(`${BASE_URL}/notes`);
    await expect(page.getByTestId('notes-list-container')).toBeVisible();

    // 15. Search for the note by its edited title
    await searchInput.fill(editedTitle);
    await searchInput.press('Enter');
    await page.waitForSelector('[data-testid="list-loading-spinner"] .ant-spin-spinning', {
      state: 'hidden',
      timeout: 5000,
    });

    // 16. Verify the updated card shows the edited title and excerpt
    const updatedCard = page
      .locator('.ant-card[data-testid^="note-card-"]')
      .filter({ hasText: editedTitle })
      .first();
    await expect(updatedCard).toBeVisible();

    // Optionally verify the content excerpt contains the edited content
    const excerpt = updatedCard.locator('[data-testid^="note-card-excerpt-"]');
    await expect(excerpt).toContainText(editedContent);

    // 17. Delete the note
    const deleteIcon = page.getByTestId(`delete-note-icon-${noteId}`);
    await deleteIcon.click();

    // Confirm deletion in popup (the button text is "Delete")
    await page.getByRole('button', { name: 'Delete' }).click();

    // 18. Verify success message
    const successMessage = page.getByText('Note deleted successfully!');
    await expect(successMessage).toBeVisible();

    // 19. Ensure the note is no longer present
    await searchInput.fill(editedTitle);
    await searchInput.press('Enter');
    await page.waitForSelector('[data-testid="list-loading-spinner"] .ant-spin-spinning', {
      state: 'hidden',
      timeout: 5000,
    });
    await expect(updatedCard).not.toBeVisible();
  });
});