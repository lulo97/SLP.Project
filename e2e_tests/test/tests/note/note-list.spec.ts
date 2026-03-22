import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:4000";

test.describe("Note CRUD via UI", () => {
  test("should create a note, search for it, and delete it", async ({
    page,
  }) => {
    // 1. Login as admin
    await page.goto(BASE_URL);
    await page.getByPlaceholder("Enter your username").fill("admin");
    await page.getByPlaceholder("Enter your password").fill("123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);

    // 2. Navigate to notes list
    await page.goto(`${BASE_URL}/notes`);
    await expect(page.getByTestId("notes-list-layout")).toBeVisible();

    // 3. Click the "Create Note" button
    await page.getByTestId("create-note-button").click();
    await expect(page).toHaveURL(`${BASE_URL}/notes/new`);

    // 4. Fill the note form
    const uniqueTitle = `Test Note ${Date.now()}`;
    const uniqueContent = "This note was created by Playwright.";

    await page.getByTestId("note-title-input").fill(uniqueTitle);
    await page.getByTestId("note-content-textarea").fill(uniqueContent);

    // 5. Submit the form
    await page.getByTestId("submit-form-button").click();

    // 6. Go back to the notes list
    await page.goto(`${BASE_URL}/notes`);
    await expect(page.getByTestId("notes-list-layout")).toBeVisible();

    // 7. Search for the note by its title
    const searchInput = page.getByTestId("note-search-input");
    await searchInput.fill(uniqueTitle);
    await searchInput.press("Enter");

    // Wait for search results to load (spinner disappears)
    await page.waitForSelector(
      '[data-testid="list-loading-spinner"] .ant-spin-spinning',
      {
        state: "hidden",
        timeout: 5000,
      },
    );

    // 8. Verify the note appears in the list
    // Since we don't know the note's ID, we'll locate the card containing the title
    const noteCard = page
      .locator(`[data-testid^="note-card-"]`)
      .filter({ hasText: uniqueTitle });
    await expect(noteCard).toBeVisible();

    // 9. Delete the note
    // Find the delete icon inside the card and click it
    const deleteIcon = noteCard.locator('[data-testid^="delete-note-icon-"]');
    await deleteIcon.click();

    // Wait for the confirmation popup and click OK
    await page.getByRole("button", { name: "OK" }).click();

    // 10. Verify success message appears
    const successMessage = page.getByText("Note deleted successfully!");
    await expect(successMessage).toBeVisible();

    // 11. (Optional) Check that the note is no longer present after search
    await searchInput.fill(uniqueTitle);
    await searchInput.press("Enter");
    await page.waitForSelector(
      '[data-testid="list-loading-spinner"] .ant-spin-spinning',
      {
        state: "hidden",
        timeout: 5000,
      },
    );
    await expect(
      page
        .locator(`[data-testid^="note-card-"]`)
        .filter({ hasText: uniqueTitle }),
    ).not.toBeVisible();
  });
});
