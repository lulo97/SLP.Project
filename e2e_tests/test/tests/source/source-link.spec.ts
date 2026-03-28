
import { test, expect } from '@playwright/test';
import { loginAsAdmin, FRONTEND_URL } from '../note/noteHelper';

test.describe('Source (URL) – create and delete via UI', () => {
  test('should create a URL source and delete it', async ({ page }) => {
    // 1. Login and go to the sources list
    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId('source-list-add-url-btn')).toBeVisible();

    // 2. Click "Add from URL" button → navigate to URL creation page
    await page.getByTestId('source-list-add-url-btn').click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-url`);
    await expect(page.getByTestId('source-url-create-card')).toBeVisible();

    // 3. Fill in the URL form
    const uniqueTitle = `Playwright URL ${Date.now()}`;
    const testUrl = 'https://en.wikipedia.org/wiki/Aquatic';
    await page.getByTestId('source-url-create-title-input').fill(uniqueTitle);
    await page.getByTestId('source-url-create-url-input').fill(testUrl);

    // 4. Submit the form
    await page.getByTestId('source-url-create-submit-btn').click();

    // 5. Wait for redirection to source detail page
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

    // 9. Confirm deletion in popconfirm
    await page.getByRole('button', { name: 'Yes' }).click();

    // 10. Wait for the item to disappear from the list
    await expect(sourceItem).not.toBeVisible();

    // Optional: verify success notification
    const successNotif = page.getByText('Source deleted');
    await expect(successNotif).toBeVisible();
  });
});