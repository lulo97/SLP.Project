
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz, add an ordering question, and delete the quiz", async ({ page }) => {
  const quizTitle = getUniqueTitle("Quiz with Ordering Question");
  const questionContent = "Arrange the steps in the correct order:";
  const items = ["First step", "Second step", "Third step"];

  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Go to quiz list and create a new quiz
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page).toHaveURL(/\/quiz$/);

  const createFab = page.getByTestId("create-quiz-fab");
  await createFab.click();
  await expect(page).toHaveURL(/\/quiz\/new/);

  // Fill quiz form
  await page.getByTestId("quiz-title-input").fill(quizTitle);
  await page
    .getByTestId("quiz-description-input")
    .fill("Quiz with an ordering question");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`ordering-quiz-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // Verify the quiz has no questions initially
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 3. Add an ordering question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  // Wait for the modal to appear
  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  // Fill question title
  await modal.getByTestId("question-title").fill(questionContent);

  // Select "Ordering" type
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-ordering").click();

  // Fill ordering items – there are 4 initial blank inputs; we'll fill the first three and remove the last one
  for (let i = 0; i < items.length; i++) {
    const itemInput = modal.getByTestId(`ordering-item-${i}`);
    await itemInput.fill(items[i]);
  }

  // Remove the extra fourth item (if it's present and empty)
  const removeButton = modal.getByTestId("ordering-remove-3");
  if (await removeButton.isVisible()) {
    await removeButton.click();
  }

  // Optional: add explanation
  await modal
    .getByTestId("question-explanation")
    .fill("Correct order: first, second, third.");

  // Submit the question
  const submitQuestionButton = modal.getByTestId("submit-question");
  await submitQuestionButton.click();

  // Wait for modal to close
  await expect(modal).not.toBeVisible();

  // 4. Verify the question appears in the list
  const questionItem = page
    .locator(`div:has-text("${questionContent}")`)
    .first();
  await expect(questionItem).toBeVisible();

  // Verify the summary shows the number of items
  const questionSummary = questionItem.locator(".text-xs.text-gray-500");
  await expect(questionSummary).toContainText(`Ordering (${items.length} items)`);

  // 5. Delete the quiz
  const deleteQuizButton = page.getByTestId("delete-quiz-button");
  await deleteQuizButton.click();

  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();

  // After deletion, redirected to quiz list
  await expect(page).toHaveURL(/\/quiz$/);

  // Switch to public tab and search for the quiz to confirm it's gone
  await page.getByTestId("tab-public-quizzes").click();
  const searchInput = page.getByTestId("search-quizzes-input");
  await searchInput.fill(quizTitle);
  await searchInput.press("Enter");

  const quizItem = page.locator(
    `[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`,
  );
  await expect(quizItem).not.toBeVisible();
});