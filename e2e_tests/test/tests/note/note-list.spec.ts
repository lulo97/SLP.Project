import { test, expect } from '@playwright/test';

test.describe('Note CRUD via UI', () => {
  const FRONTEND_URL = 'http://localhost:4000';

  test('should create a note, search for it, and delete it', async ({ page }) => {
    // 1. Login as admin
    await page.goto(FRONTEND_URL);
    await page.getByPlaceholder('Enter your username').fill('admin');
    await page.getByPlaceholder('Enter your password').fill('123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // 2. Navigate to notes list
    await page.goto(`${FRONTEND_URL}/notes`);
    await expect(page.getByTestId('layout-container')).toBeVisible();

    // 3. Click "Create Note" button
    await page.getByRole('button', { name: /Create Note/i }).click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/notes/new`);

    // 4. Fill the note form with a unique title and content
    const uniqueTitle = `Test Note ${Date.now()}`;
    const uniqueContent = 'This is a test note created by Playwright.';

    await page.getByPlaceholder('Enter note title').fill(uniqueTitle);
    await page.getByPlaceholder('Write your note content here...').fill(uniqueContent);

    // 5. Submit the form
    await page.getByRole('button', { name: 'Create' }).click();

    // After creation, we are redirected to the note detail page (URL contains /notes/:id)
    await page.waitForURL(/\/notes\/\d+/);

    // 6. Go back to the notes list
    await page.goto(`${FRONTEND_URL}/notes`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/notes`);

    // 7. Search for the note by its title
    const searchInput = page.getByPlaceholder('Search notes...');
    await searchInput.fill(uniqueTitle);
    await searchInput.press('Enter');

    // Wait for the search to finish (loading spinner disappears)
    await page.waitForFunction(() => !document.querySelector('.ant-spin-spinning'), { timeout: 5000 });

    // 8. Verify the note appears in the list
    const noteCard = page.locator('.ant-card').filter({ hasText: uniqueTitle });
    await expect(noteCard).toBeVisible();

    // 9. Delete the note
    // Locate the delete button inside the card and click it
    await noteCard.locator('button[aria-label="delete"]').click(); // or use a more specific selector
    // Alternatively: find the popconfirm button by its text
    await page.getByRole('button', { name: 'OK' }).click(); // confirm deletion

    // 10. Verify success message appears
    const successMessage = page.getByText('Note deleted successfully!');
    await expect(successMessage).toBeVisible();

    // 11. (Optional) Check that the note is no longer present after search
    await searchInput.fill(uniqueTitle);
    await searchInput.press('Enter');
    await expect(page.locator('.ant-card').filter({ hasText: uniqueTitle })).not.toBeVisible();
  });
});