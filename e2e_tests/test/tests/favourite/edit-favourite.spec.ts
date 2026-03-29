import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToFavourites,
  createFavouriteViaUI,
  deleteFavouriteViaUI,
  searchForFavourite,
  getFavouriteCardByText,
  openFavouriteEditPage,
  verifyFavouriteFormValues,
  fillFavouriteForm,
  submitFavouriteForm,
} from './favouriteHelper.ts';

test.describe('Favourite Edit and Delete via UI', () => {
  test('should create a favourite, edit its text and note, and delete it', async ({ page }) => {
    // 1. Login and go to favourites list
    await loginAsAdmin(page);
    await navigateToFavourites(page);

    // 2. Create a favourite with original values
    const originalText = `Original Favourite ${Date.now()}`;
    const originalType = 'favourite-type-option-word';
    const originalNote = 'This is the original note.';
    const editedText = `${originalText} (edited)`;
    const editedNote = 'This note has been updated.';

    const { id } = await createFavouriteViaUI(page, originalText, originalType, originalNote);

    // 3. Open edit page and verify pre-filled values
    await openFavouriteEditPage(page, id);
    await verifyFavouriteFormValues(page, originalText, originalType, originalNote);

    // 4. Edit the favourite and submit
    await fillFavouriteForm(page, editedText, originalType, editedNote);
    await submitFavouriteForm(page);

    // 5. Verify the updated favourite appears with edited content
    await searchForFavourite(page, editedText);
    const updatedCard = await getFavouriteCardByText(page, editedText);
    const noteLocator = updatedCard.locator('[data-testid="favorite-item-note"]');
    await expect(noteLocator).toContainText(editedNote);

    // 6. Delete the favourite
    await deleteFavouriteViaUI(page, id);

    // 7. Ensure it's gone
    await searchForFavourite(page, editedText);
    await expect(updatedCard).not.toBeVisible();
  });
});