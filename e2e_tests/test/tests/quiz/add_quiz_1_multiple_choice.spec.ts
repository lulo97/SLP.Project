// e2e_tests/test/tests/quiz/add_quiz_1_multiple_choice.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create an empty quiz, add a multiple choice question, then delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("Quiz with MC Question");
  const questionContent = "What is the capital of France?";
  const option1 = "Berlin";
  const option2 = "Madrid";
  const option3 = "Paris";
  const option4 = "Lisbon";

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
    .fill("Quiz with a multiple choice question");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`mc-quiz-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // Verify the quiz has no questions initially
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 3. Add a multiple choice question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  // Wait for the modal to appear
  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  // Fill question details
  await modal.getByTestId("question-title").fill(questionContent);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-multiple-choice").click(); //modal not contains option-multiple-choice

  // Now fill the options using MultipleChoice component
  // Option 1
  const option0Input = modal.getByTestId("mc-option-0-input");
  await option0Input.fill(option1);
  // Option 2
  const option1Input = modal.getByTestId("mc-option-1-input");
  await option1Input.fill(option2);
  // Option 3
  const option2Input = modal.getByTestId("mc-option-2-input");
  await option2Input.fill(option3);
  // Option 4
  const option3Input = modal.getByTestId("mc-option-3-input");
  await option3Input.fill(option4);

  // Mark the correct answer (Paris) – it's the third option (index 2)
  const correctCheckbox = modal.getByTestId("mc-option-2-checkbox");
  await correctCheckbox.check();

  // Optional: add explanation
  await modal
    .getByTestId("question-explanation")
    .fill("Paris is the capital of France.");

  // Submit the question
  const submitQuestionButton = modal.getByTestId("submit-question");
  await submitQuestionButton.click();

  // Wait for modal to close
  await expect(modal).not.toBeVisible();

  // 4. Verify the question appears in the list
  // Since there's no testid for each question item, we rely on text content
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
