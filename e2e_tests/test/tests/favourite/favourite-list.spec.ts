import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToFavourites,
  createFavouriteViaUI,
  deleteFavouriteViaUI,
  searchForFavourite,
} from './favouriteHelper.ts';

test.describe('Favourite CRUD via UI', () => {
  test('should create a favourite, search for it, and delete it', async ({ page }) => {
    // 1. Login and go to favourites list
    await loginAsAdmin(page);
    await navigateToFavourites(page);

    // 2. Create a favourite
    const uniqueText = `Test Favourite ${Date.now()}`;
    const uniqueType = 'word';
    const uniqueNote = 'This favourite was created by Playwright.';

    const { id } = await createFavouriteViaUI(page, uniqueText, uniqueType, uniqueNote);

    // 3. Delete the favourite
    await deleteFavouriteViaUI(page, id);

    // 4. Verify it's no longer present
    await searchForFavourite(page, uniqueText);
    const card = page
      .locator('[data-testid^="favourite-card-"]')
      .filter({ hasText: uniqueText })
      .first();
    await expect(card).not.toBeVisible();
  });
});