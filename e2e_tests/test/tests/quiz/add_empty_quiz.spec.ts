
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils"; // reuse existing helpers

test("admin can create an empty quiz and delete it", async ({ page }) => {
  const quizTitle = getUniqueTitle("Empty Quiz");

  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Go to the quiz list page
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page).toHaveURL(/\/quiz$/);

  // 3. Click the floating action button to create a new quiz
  const createFab = page.getByTestId("create-quiz-fab");
  await createFab.click();
  await expect(page).toHaveURL(/\/quiz\/new/);

  // 4. Fill the quiz creation form
  await page.getByTestId("quiz-title-input").fill(quizTitle);
  await page
    .getByTestId("quiz-description-input")
    .fill("This quiz has no questions");
  // Choose public visibility (or leave default)
  const publicRadio = page.getByTestId("quiz-visibility-public");
  await publicRadio.check();

  // Add a tag (optional)
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  const tagName = `empty-quiz-${Date.now()}`;
  await tagInput.fill(tagName);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  // Submit the form
  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // 5. Verify redirection to the quiz detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // 6. Verify the quiz has no questions
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 7. Delete the quiz via the actions card
  const deleteButton = page.getByTestId("delete-quiz-button");
  await deleteButton.click();

  // Confirm deletion in the popconfirm
  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();

  // 8. After deletion we are redirected to the quiz list
  await expect(page).toHaveURL(/\/quiz$/);

  // After deletion (and redirection to /quiz), click the "Public Quizzes" tab
  await page.getByTestId("tab-public-quizzes").click();

  // 9. Verify the quiz no longer appears in the list (search for it)
  const searchInput = page.getByTestId("search-quizzes-input");
  await searchInput.fill(quizTitle);
  await searchInput.press("Enter");

  // The list should be empty (or at least not contain our quiz)
  const quizItem = page.locator(
    `[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`,
  );
  await expect(quizItem).not.toBeVisible();
});
