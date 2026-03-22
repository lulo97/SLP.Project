// e2e_tests/test/tests/source/create-delete-note.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin, FRONTEND_URL } from '../note/noteHelper';

test.describe('Source (Note) – create and delete via UI', () => {
  test('should create a note source and delete it', async ({ page }) => {
    // 1. Login and go to the sources list
    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId('source-list-add-text-btn')).toBeVisible();

    // 2. Click "Add Text" button → navigate to note creation page
    await page.getByTestId('source-list-add-text-btn').click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-text`);
    await expect(page.getByTestId('source-note-create-card')).toBeVisible();

    // 3. Fill in the note form
    const uniqueTitle = `Playwright Note ${Date.now()}`;
    const uniqueContent = 'This note was created by the frontend-only test.';
    await page.getByTestId('source-note-create-title-input').fill(uniqueTitle);
    await page.getByTestId('source-note-create-content-input').fill(uniqueContent);

    // 4. Submit the form
    await page.getByTestId('source-note-create-submit-btn').click();

    // 5. After creation, the page redirects to the source detail page.
    //    Wait for the URL to contain a numeric source ID.
    await page.waitForURL(/\/source\/\d+/);
    const urlMatch = page.url().match(/\/source\/(\d+)/);
    expect(urlMatch).toBeTruthy();
    const sourceId = urlMatch![1];

    // 6. Navigate back to the sources list
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId('source-list')).toBeVisible();

    // 7. Verify the new source appears in the list
    const sourceItem = page.locator(`[data-testid="source-list-item-${sourceId}"]`);
    await expect(sourceItem).toBeVisible();
    await expect(sourceItem).toContainText(uniqueTitle);

    // 8. Delete the source
    const deleteBtn = sourceItem.locator(`[data-testid="source-list-delete-btn-${sourceId}"]`);
    await deleteBtn.click();

    // 9. Confirm the deletion in the popconfirm dialog
    await page.getByRole('button', { name: 'Yes' }).click();

    // 10. Wait for the item to disappear from the list
    await expect(sourceItem).not.toBeVisible();

    // (Optional) verify a success notification appears
    const successNotif = page.getByText('Source deleted');
    await expect(successNotif).toBeVisible();
  });
});