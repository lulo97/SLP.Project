
import { test, expect } from '@playwright/test';
import { loginAsAdmin, FRONTEND_URL } from '../note/noteHelper';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Source (PDF) – upload, verify, and delete via UI', () => {
  // Path to the test PDF file (assumed to be in the fixtures folder)
  const pdfPath = path.join(__dirname, './Aquatic.pdf');

  test.beforeAll(() => {
    // Throw an error if the required PDF file is not found.
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Test file not found: ${pdfPath}. Please place Aquatic.pdf in the fixtures folder.`);
    }
  });

  test('should upload a PDF file, view it, and delete it', async ({ page }) => {
    // 1. Login and go to the sources list
    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId('source-list-upload-btn')).toBeVisible();

    // 2. Click "Upload File" button → navigate to upload page
    await page.getByTestId('source-list-upload-btn').click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/upload`);
    await expect(page.getByTestId('source-upload-card')).toBeVisible();

    // 3. Fill in the optional title (or leave blank to let parser detect)
    const uniqueTitle = `Playwright PDF ${Date.now()}`;
    await page.getByTestId('source-upload-title-input').fill(uniqueTitle);

    // 4. Upload the file using the drag & drop area
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pdfPath);

    // Verify the file name appears
    await expect(page.getByTestId('source-upload-selected-file')).toContainText('Aquatic.pdf');

    // 5. Submit the form
    await page.getByTestId('source-upload-submit-btn').click();

    // 6. Wait for redirection to source detail page
    await page.waitForURL(/\/source\/\d+/);
    const urlMatch = page.url().match(/\/source\/(\d+)/);
    expect(urlMatch).toBeTruthy();
    const sourceId = urlMatch![1];

    // 7. Verify the source detail page shows the correct title
    await expect(page.getByTestId('source-detail-article-title')).toContainText(
      uniqueTitle
    );

    // (Optional) Check that some content is present – the PDF parser should extract text.
    // The article may contain "Aquatic" or other expected text.
    await expect(page.getByTestId('source-detail-content-plain')).toContainText(/aquatic/i);

    // 8. Navigate back to the sources list
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId('source-list')).toBeVisible();

    // 9. Verify the new source appears in the list
    const sourceItem = page.locator(`[data-testid="source-list-item-${sourceId}"]`);
    await expect(sourceItem).toBeVisible();
    await expect(sourceItem).toContainText(uniqueTitle);

    // 10. Delete the source
    const deleteBtn = sourceItem.locator(`[data-testid="source-list-delete-btn-${sourceId}"]`);
    await deleteBtn.click();

    // 11. Confirm deletion in popconfirm
    await page.getByRole('button', { name: 'Yes' }).click();

    // 12. Wait for the item to disappear from the list
    await expect(sourceItem).not.toBeVisible();

    // Optional: verify success notification
    const successNotif = page.getByText('Source deleted');
    await expect(successNotif).toBeVisible();
  });
});