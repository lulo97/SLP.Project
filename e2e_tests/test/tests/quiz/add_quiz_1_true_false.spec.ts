
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create an empty quiz, add a true/false question, then delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("Quiz with True/False Question");
  const questionContent = "The capital of France is Berlin.";
  const correctAnswer = "false"; // false because the statement is incorrect

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
    .fill("Quiz with a true/false question");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`tf-quiz-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // Verify the quiz has no questions initially
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 3. Add a true/false question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  // Wait for the modal to appear
  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  // Fill question details
  await modal.getByTestId("question-title").fill(questionContent);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-true-false").click(); // select True/False type

  // Select the correct answer (false)
  const falseRadio = modal.getByTestId("true-false-false");
  await falseRadio.check();

  // Optional: add explanation
  await modal
    .getByTestId("question-explanation")
    .fill("Berlin is not the capital of France; Paris is.");

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