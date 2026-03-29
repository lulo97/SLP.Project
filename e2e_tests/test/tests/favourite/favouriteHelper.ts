import { Page, Locator, expect, request } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3009";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3008";

// ----------------------------------------------------------------------
// API Helpers
// ----------------------------------------------------------------------

export async function loginAsAdmin(page: Page): Promise<string> {
  await page.goto(FRONTEND_URL);
  await page.getByPlaceholder("Enter your username").fill("admin");
  await page.getByPlaceholder("Enter your password").fill("123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(`${FRONTEND_URL}/dashboard`);

  const token = await page.evaluate(() =>
    localStorage.getItem("session_token"),
  );
  if (!token) throw new Error("Failed to retrieve session token");
  return token;
}

export async function createFavouriteViaAPI(
  token: string,
  text: string,
  type: string,
  note?: string,
): Promise<number> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  const response = await context.post(`${BACKEND_URL}/api/favorites`, {
    headers: {
      "X-Session-Token": token,
      "Content-Type": "application/json",
    },
    data: { text, type, note },
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to create favourite: ${response.status()} ${await response.text()}`,
    );
  }
  const favourite = await response.json();
  return favourite.id;
}

export async function deleteFavouriteViaAPI(
  token: string,
  favouriteId: number,
): Promise<void> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  const response = await context.delete(
    `${BACKEND_URL}/api/favorites/${favouriteId}`,
    {
      headers: { "X-Session-Token": token },
    },
  );
  if (!response.ok()) {
    throw new Error(
      `Failed to delete favourite: ${response.status()} ${await response.text()}`,
    );
  }
}

// ----------------------------------------------------------------------
// UI Helpers
// ----------------------------------------------------------------------

export async function navigateToFavourites(page: Page): Promise<void> {
  await page.goto(`${FRONTEND_URL}/favourites`);
  await expect(page.getByTestId("favourites-list-container")).toBeVisible();
}

export async function waitForLoadingSpinnerToHide(page: Page): Promise<void> {
  await page.waitForSelector(
    '[data-testid="list-loading-spinner"] .ant-spin-spinning',
    {
      state: "hidden",
      timeout: 5000,
    },
  );
}

export async function searchForFavourite(
  page: Page,
  text: string,
): Promise<void> {
  const searchInput = page.getByTestId("favourite-search-input");
  await searchInput.fill(text);
  await searchInput.press("Enter");
  await waitForLoadingSpinnerToHide(page);
}

export async function getFavouriteCardByText(
  page: Page,
  text: string,
): Promise<Locator> {
  const card = page
    .locator('[data-testid^="favourite-card-"]')
    .filter({ hasText: text })
    .first();
  await expect(card).toBeVisible();
  return card;
}

export async function extractFavouriteIdFromCard(
  card: Locator,
): Promise<string> {
  const testId = await card.getAttribute("data-testid");
  const id = testId?.match(/favourite-card-(\d+)/)?.[1];
  if (!id) throw new Error("Could not extract favourite ID from card");
  return id;
}

export async function fillFavouriteForm(
  page: Page,
  text: string,
  type: string,
  note?: string,
): Promise<void> {
  await page.getByTestId("favourite-text-input").fill(text);

  // Open the dropdown trigger
  await page.getByTestId("favourite-type-select").click();

  // ✅ Use the title attribute — immune to comment-node whitespace padding.
  //
  // Vue AntD:         <div class="ant-select-item-option" title="Word">Word</div>
  // Angular ng-zorro: <nz-option-item class="ant-select-item-option" title="Word">
  //                     <!--container--> Word <!--container-->
  //                   </nz-option-item>
  //
  // hasText on Angular yields " Word " (spaces from comment boundaries),
  // so /^Word$/i never matches. title="Word" is clean on both.
  const option = page.locator(`.ant-select-item-option[title="${type}"]`);
  await option.click();

  if (note) {
    await page.getByTestId("favourite-note-textarea").fill(note);
  }
}

export async function submitFavouriteForm(page: Page): Promise<void> {
  await page.getByTestId("submit-form-button").click();
  await page.waitForURL(`${FRONTEND_URL}/favourites`);
  await expect(page.getByTestId("favourites-list-container")).toBeVisible();
}

export async function createFavouriteViaUI(
  page: Page,
  text: string,
  type: string,
  note?: string,
): Promise<{ id: string; card: Locator }> {
  await page.getByTestId("create-favourite-button").click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/favourites/new`);

  await fillFavouriteForm(page, text, type, note);
  await submitFavouriteForm(page);

  await searchForFavourite(page, text);
  const card = await getFavouriteCardByText(page, text);
  const id = await extractFavouriteIdFromCard(card);

  return { id, card };
}

export async function openFavouriteEditPage(
  page: Page,
  id: string,
): Promise<void> {
  const editIcon = page.getByTestId(`edit-favourite-icon-${id}`);
  await editIcon.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/favourites/${id}/edit`);
  await expect(page.getByTestId("favorite-form-container")).toBeVisible();
}

export async function verifyFavouriteFormValues(
  page: Page,
  expectedText: string,
  expectedType: string,
  expectedNote?: string,
): Promise<void> {
  await expect(page.getByTestId("favourite-text-input")).toHaveValue(
    expectedText,
  );

  // ✅ Use toHaveAttribute("title") instead of toHaveText().
  //
  // The selection trigger renders differently per framework:
  //   Vue AntD:         <div class="ant-select-selection-item" title="Word">Word</div>
  //   Angular ng-zorro: <nz-select-item class="ant-select-selection-item" title="Word">
  //                       <!--container--> Word <!--container-->
  //                     </nz-select-item>
  //
  // toHaveText on Angular gives " Word " due to comment-node padding,
  // so /^Word$/i fails. Both frameworks set title="<label>" on the trigger
  // element, so toHaveAttribute is clean and works on both.
  const selectLabel = page.locator(
    '[data-testid="favourite-type-select"] .ant-select-selection-item',
  );
  await expect(selectLabel).toHaveAttribute(
    "title",
    new RegExp(`^${expectedType}$`, "i"),
  );

  if (expectedNote) {
    await expect(page.getByTestId("favourite-note-textarea")).toHaveValue(
      expectedNote,
    );
  }
}

export async function deleteFavouriteViaUI(
  page: Page,
  id: string,
): Promise<void> {
  const deleteIcon = page.getByTestId(`delete-favourite-icon-${id}`);
  await deleteIcon.click();
  await page.getByRole("button", { name: "Delete" }).click();

  const successMessage = page.getByText("Favourite deleted successfully!");
  await expect(successMessage).toBeVisible();
}