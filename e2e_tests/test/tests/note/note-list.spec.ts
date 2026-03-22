import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test.describe('Note CRUD via UI', () => {
  test('should create a note, search for it, and delete it', async ({ page }) => {
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

    // 4. Fill the form
    const uniqueTitle = `Test Note ${Date.now()}`;
    const uniqueContent = 'This note was created by Playwright.';

    await page.getByTestId('note-title-input').fill(uniqueTitle);
    await page.getByTestId('note-content-textarea').fill(uniqueContent);

    // 5. Submit the form
    await page.getByTestId('submit-form-button').click();

    // 6. Wait for redirection to the notes list page
    await page.waitForURL(`${BASE_URL}/notes`);
    await expect(page.getByTestId('notes-list-container')).toBeVisible();

    // 7. Search for the note by title
    const searchInput = page.getByTestId('note-search-input');
    await searchInput.fill(uniqueTitle);
    await searchInput.press('Enter');

    // Wait for loading to finish
    await page.waitForSelector('[data-testid="list-loading-spinner"] .ant-spin-spinning', {
      state: 'hidden',
      timeout: 5000,
    });

    // 8. Find the note card using the card class and filter by title
    const noteCard = page
      .locator('.ant-card[data-testid^="note-card-"]')
      .filter({ hasText: uniqueTitle })
      .first();
    await expect(noteCard).toBeVisible();

    // Extract the note ID from the data-testid attribute (e.g., "note-card-123")
    const testId = await noteCard.getAttribute('data-testid');
    const noteId = testId?.match(/note-card-(\d+)/)?.[1];
    expect(noteId).toBeDefined();

    // 9. Delete the note using the delete icon with that ID
    const deleteIcon = page.getByTestId(`delete-note-icon-${noteId}`);
    await deleteIcon.click();

    // Confirm deletion in popup
    await page.getByRole('button', { name: 'Delete' }).click();

    // 10. Verify success message
    const successMessage = page.getByText('Note deleted successfully!');
    await expect(successMessage).toBeVisible();

    // 11. Ensure the note is no longer present
    await searchInput.fill(uniqueTitle);
    await searchInput.press('Enter');
    await page.waitForSelector('[data-testid="list-loading-spinner"] .ant-spin-spinning', {
      state: 'hidden',
      timeout: 5000,
    });
    await expect(noteCard).not.toBeVisible();
  });
});