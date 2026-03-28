// e2e_tests/test/tests/quiz/add_edit_delete_quiz.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create an empty quiz, edit its title, and delete it", async ({ page }) => {
  const originalTitle = getUniqueTitle("Empty Quiz");
  const editedTitle = getUniqueTitle("Edited Quiz");

  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Go to quiz list and create a new quiz
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page).toHaveURL(/\/quiz$/);

  const createFab = page.getByTestId("create-quiz-fab");
  await createFab.click();
  await expect(page).toHaveURL(/\/quiz\/new/);

  // Fill quiz form
  await page.getByTestId("quiz-title-input").fill(originalTitle);
  await page
    .getByTestId("quiz-description-input")
    .fill("This quiz has no questions");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional: add a tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`empty-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // 3. Verify creation: redirected to quiz detail page with correct title
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(originalTitle);
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 4. Edit the quiz title
  const editQuizButton = page.getByTestId("edit-quiz-button");
  await editQuizButton.click();
  await expect(page).toHaveURL(new RegExp(`/quiz/\\d+/edit`));

  // Update title
  const titleInput = page.getByTestId("quiz-title-input");
  await titleInput.fill(editedTitle);
  await page.getByTestId("quiz-submit-button").click();

  // 5. Verify the title changed on detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(editedTitle);
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 6. Delete the quiz
  const deleteButton = page.getByTestId("delete-quiz-button");
  await deleteButton.click();

  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();

  // After deletion we are redirected to the quiz list
  await expect(page).toHaveURL(/\/quiz$/);

  // Switch to public tab and search for the original/edited title to verify it's gone
  await page.getByTestId("tab-public-quizzes").click();
  const searchInput = page.getByTestId("search-quizzes-input");
  await searchInput.fill(editedTitle);
  await searchInput.press("Enter");

  const quizItem = page.locator(
    `[data-testid^="quiz-list-item-"]:has-text("${editedTitle}")`
  );
  await expect(quizItem).not.toBeVisible();
});