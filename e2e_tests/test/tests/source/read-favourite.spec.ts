
import { test, expect } from '@playwright/test';
import { loginAsAdmin, FRONTEND_URL } from '../note/noteHelper';
import {
  navigateToFavourites,
  searchForFavourite,
  getFavouriteCardByText,
  deleteFavouriteViaUI,
} from '../favourite/favouriteHelper';

test.describe('Source and favourite – full flow', () => {
  test('should create a note source, add a favourite from it, delete the favourite, and delete the source', async ({
    page,
  }) => {
    // 1. Log in and go to sources list
    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId('source-list-add-text-btn')).toBeVisible();

    // 2. Create a new text source (note) with a unique title and content
    await page.getByTestId('source-list-add-text-btn').click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-text`);
    await expect(page.getByTestId('source-text-create-card')).toBeVisible();

    const uniqueTitle = `Playwright Source ${Date.now()}`;
    // The content must contain the text we will select later
    const selectedText = 'This sentence will be added as a favourite.';
    const sampleContent = `Some introductory text. ${selectedText} Some more text after.`;
    await page.getByTestId('source-text-create-title-input').fill(uniqueTitle);
    await page
      .getByTestId('source-note-create-content-input')
      .fill(sampleContent);
    await page.getByTestId('source-note-create-submit-btn').click();

    // 3. Wait for the source detail page to load and capture the source ID
    await page.waitForURL(/\/source\/\d+/);
    const urlMatch = page.url().match(/\/source\/(\d+)/);
    expect(urlMatch).toBeTruthy();
    const sourceId = urlMatch![1];

    // 4. Wait for the article content to be visible
    await expect(page.getByTestId('source-detail-article')).toBeVisible();
    await expect(page.getByTestId('source-detail-content-plain')).toBeVisible();

    // 5. Select the specific text programmatically
    const firstParagraph = page
      .locator('[data-testid="source-detail-content-plain"] p')
      .first();

    await firstParagraph.evaluate((el, text) => {
      const textNode = el.firstChild;
      if (!textNode || !textNode.textContent) return;

      const startIdx = textNode.textContent.indexOf(text);
      if (startIdx === -1) return;
      const endIdx = startIdx + text.length;

      const range = document.createRange();
      range.setStart(textNode, startIdx);
      range.setEnd(textNode, endIdx);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Trigger mouseup to show the selection bubble
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    }, selectedText);

    // 6. Wait for the selection bubble and click the “Save” button
    await expect(page.getByTestId('selection-bubble')).toBeVisible();
    await page.getByTestId('selection-bubble-save-btn').click();

    // 7. Wait for the favourite modal to appear and fill in details
    const modal = page.getByTestId('source-detail-favorite-modal');
    await expect(modal).toBeVisible();

    // The text should be pre-filled; we can optionally verify it
    const textArea = page.getByTestId('source-detail-favorite-text-input');
    await expect(textArea).toHaveValue(selectedText);

    // Choose a type (e.g., "phrase")
    await page.getByTestId('source-detail-favorite-type-phrase').click();

    // Add a note (optional)
    const note = `Favourite added via e2e test on ${new Date().toISOString()}`;
    await page.getByTestId('source-detail-favorite-note-input').fill(note);

    // Submit the modal by clicking the OK button (text is "Save")
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for the modal to close and a success notification appears
    await expect(modal).not.toBeVisible();
    const successNotif = page.getByText('Saved to favorites');
    await expect(successNotif).toBeVisible({ timeout: 5000 });

    // 8. Navigate to the favourites page
    await navigateToFavourites(page);
    await expect(page.getByTestId('favourites-list-container')).toBeVisible();

    // 9. Search for the favourite by the selected text
    await searchForFavourite(page, selectedText);

    // 10. Locate the favourite card and verify it contains the note
    const favouriteCard = await getFavouriteCardByText(page, selectedText);
    const noteLocator = favouriteCard.locator('[data-testid="favorite-item-note"]');
    await expect(noteLocator).toContainText(note);

    // 11. Delete the favourite via UI
    // Extract the favourite ID from the card's data-testid
    const favouriteId = await favouriteCard.getAttribute('data-testid')
      .then(id => id?.match(/favourite-card-(\d+)/)?.[1]);
    expect(favouriteId).toBeTruthy();
    await deleteFavouriteViaUI(page, favouriteId!);

    // 12. Go back to the sources list
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId('source-list')).toBeVisible();

    // 13. Locate the source item by its ID and delete it
    const sourceItem = page.locator(`[data-testid="source-list-item-${sourceId}"]`);
    await expect(sourceItem).toBeVisible();
    await sourceItem
      .locator(`[data-testid="source-list-delete-btn-${sourceId}"]`)
      .click();

    // 14. Confirm deletion
    await page.getByRole('button', { name: 'Yes' }).click();

    // 15. Wait for the item to disappear from the list
    await expect(sourceItem).not.toBeVisible();

    // Optional: verify success notification
    const deleteNotif = page.getByText('Source deleted');
    await expect(deleteNotif).toBeVisible();
  });
});