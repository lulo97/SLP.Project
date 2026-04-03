import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  login,
  generateUniqueUser,
  getSessionToken,
} from "../login/utils";
import {
  createFavouriteViaUI,
  deleteFavouriteViaUI,
  searchForFavourite as searchFavouriteInList,
  getFavouriteCardByText,
} from "../favourite/favouriteHelper";

test("user creates a favourite, searches for it, deletes it, admin deletes user", async ({
  browser,
}) => {
  test.setTimeout(180000);

  // 1. Create user via API
  const user = generateUniqueUser();
  let userId: number;

  await test.step("API: register user", async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    const resp = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: user,
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    userId = data.id;

    await context.close();
  });

  // 2. User creates a favourite
  const favouriteText = `Test Favourite ${Date.now()}`;
  const favouriteType = "word";
  const favouriteNote = "This favourite is for search test.";

  await test.step("User: create favourite", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);

    // Navigate to favourites page
    await page.goto(`${FRONTEND_URL}/favourites`);
    await expect(page.getByTestId("favourites-list-container")).toBeVisible();

    // Create favourite via UI helper
    const { id, card } = await createFavouriteViaUI(
      page,
      favouriteText,
      `favourite-type-option-${favouriteType}`,
      favouriteNote,
    );
    expect(id).toBeTruthy();

    await context.close();
  });

  // 3. User searches for the favourite (global search)
  await test.step("User: search for own favourite", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);

    // Go to search page
    await page.goto(`${FRONTEND_URL}/search`);
    await page.getByTestId("search-input").fill(favouriteText);
    await page.getByTestId("search-input").press("Enter");

    // Wait for results to load (All tab)
    const resultLocator = page.locator(
      `[data-testid^="search-result-item-"]:has-text("${favouriteText}")`,
    );
    await expect(resultLocator).toBeVisible({ timeout: 15000 });

    // Switch to Favourites tab and verify
    const favoritesTab = page.getByTestId("search-tab-favorite");
    await favoritesTab.click();
    await expect(resultLocator).toBeVisible();

    await context.close();
  });

  // 4. User deletes the favourite
  await test.step("User: delete the favourite", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);
    await page.goto(`${FRONTEND_URL}/favourites`);

    // Search for the favourite in the favourites list
    await searchFavouriteInList(page, favouriteText);
    const card = await getFavouriteCardByText(page, favouriteText);
    const id = await card.getAttribute("data-testid");
    const favouriteId = id?.match(/favourite-card-(\d+)/)?.[1];
    expect(favouriteId).toBeTruthy();

    // Delete it
    await deleteFavouriteViaUI(page, favouriteId!);

    // Verify it's gone from the list
    await searchFavouriteInList(page, favouriteText);
    await expect(card).not.toBeVisible();

    await context.close();
  });

  // 5. User verifies the favourite is gone from global search
  await test.step("User: verify favourite is removed from search", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);
    await page.goto(`${FRONTEND_URL}/search`);

    await page.getByTestId("search-input").fill(favouriteText);
    await page.getByTestId("search-input").press("Enter");

    await expect(page.getByTestId("search-no-results")).toBeVisible({
      timeout: 10000,
    });

    await context.close();
  });

  // 6. Cleanup: admin deletes user
  await test.step("Admin: delete user", async () => {
    const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(FRONTEND_URL);
    await login(
      adminPage,
      ADMIN_CREDENTIALS.username,
      ADMIN_CREDENTIALS.password,
    );

    const adminToken = await getSessionToken(adminPage);

    await adminPage.request.delete(`${BACKEND_URL}/api/users/${userId}`, {
      headers: { "X-Session-Token": adminToken! },
    });

    await adminContext.close();
  });
});