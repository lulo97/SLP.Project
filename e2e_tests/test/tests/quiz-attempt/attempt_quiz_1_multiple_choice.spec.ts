// e2e_tests/test/tests/quiz/attempt_quiz_1_multiple_choice.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz with 1 multiple-choice question, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("MC Quiz");
  const questionContent = "What is the capital of France?";
  const correctAnswerText = "Paris";
  const wrongOption1 = "Berlin";
  const wrongOption2 = "Madrid";
  const wrongOption3 = "Lisbon";

  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Create an empty quiz
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page).toHaveURL(/\/quiz$/);

  const createFab = page.getByTestId("create-quiz-fab");
  await createFab.click();
  await expect(page).toHaveURL(/\/quiz\/new/);

  await page.getByTestId("quiz-title-input").fill(quizTitle);
  await page.getByTestId("quiz-description-input").fill("Quiz to test attempt");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`attempt-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page and extract quiz ID
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  const quizId = /\/quiz\/(\d+)/.exec(page.url())![1];
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // 3. Add a multiple‑choice question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  await modal.getByTestId("question-title").fill(questionContent);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-multiple-choice").click();

  // Fill options
  await modal.getByTestId("mc-option-0-input").fill(wrongOption1);
  await modal.getByTestId("mc-option-1-input").fill(wrongOption2);
  await modal.getByTestId("mc-option-2-input").fill(correctAnswerText);
  await modal.getByTestId("mc-option-3-input").fill(wrongOption3);

  // Mark the correct answer (third option, index 2)
  await modal.getByTestId("mc-option-2-checkbox").check();

  await modal
    .getByTestId("question-explanation")
    .fill("Paris is the capital of France.");
  await modal.getByTestId("submit-question").click();

  await expect(modal).not.toBeVisible();

  // Verify the question appears on the detail page
  await expect(
    page.locator(`div:has-text("${questionContent}")`).first(),
  ).toBeVisible();

  // 4. Start a new attempt
  await page.goto(`${FRONTEND_URL}/quiz/${quizId}/attempt`);

  // Start modal appears
  const startModal = page.getByTestId("start-options-modal");
  await expect(startModal).toBeVisible();

  // Click the Start button (the only button in the modal)
  // Instead of searching inside the body div, look for the button in the whole modal
  const startButton = page
    .locator(".ant-modal-footer")
    .getByRole("button", { name: "Start" });
  await startButton.click();

  // Wait for the player to load
  await expect(page.getByTestId("player-container")).toBeVisible();

  // 5. Answer the question
  const mcGroup = page.getByTestId("question-type-multiple-choice");
  await expect(mcGroup).toBeVisible();

  // Find the checkbox with the correct answer text and check it
  const correctCheckbox = page.getByRole("checkbox", {
    name: correctAnswerText,
  });
  await correctCheckbox.check();
  await expect(correctCheckbox).toBeChecked();

  // 6. Submit the attempt
  const submitButtonPlayer = page.getByTestId("submit-attempt");
  await submitButtonPlayer.click();

  // Submit confirmation modal
  const submitModal = page.getByTestId("submit-modal-message");
  await expect(submitModal).toBeVisible();
  const confirmSubmit = page.locator(".ant-modal-footer").getByRole("button", {
    name: "Yes, submit",
  });
  await confirmSubmit.click();

  // Wait for redirect to review page
  await expect(page).toHaveURL(/\/quiz\/attempt\/\d+\/review/);
  await expect(page.getByTestId("review-container")).toBeVisible();

  // 7. Verify review page content
  const scoreValue = page.getByTestId("score-value");
  await expect(scoreValue).toHaveText("1 / 1");

  const scorePercent = page.getByTestId("score-percent");
  await expect(scorePercent).toHaveText("100%");

  const correctCount = page.getByTestId("correct-count");
  const incorrectCount = page.getByTestId("incorrect-count");
  await expect(correctCount).toHaveText("1 correct");
  await expect(incorrectCount).toHaveText("0 incorrect");

  // Verify the question card indicates correct answer
  const questionCard = page.getByTestId("review-question-0");
  await expect(questionCard).toHaveAttribute("data-correct", "true");

  // Check the displayed user answer contains the correct text
  const userAnswer = page.getByTestId("review-user-answer-0");
  await expect(userAnswer).toContainText(correctAnswerText);

  // 8. Go back to quiz detail and delete the quiz
  const backToQuizButton = page.getByTestId("back-to-quiz");
  await backToQuizButton.click();
  await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}$`));

  const deleteQuizButton = page.getByTestId("delete-quiz-button");
  await deleteQuizButton.click();
  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();

  // After deletion, redirected to quiz list
  await expect(page).toHaveURL(/\/quiz$/);

  // Verify the quiz is gone
  await page.getByTestId("tab-public-quizzes").click();
  const searchInput = page.getByTestId("search-quizzes-input");
  await searchInput.fill(quizTitle);
  await searchInput.press("Enter");

  const quizItem = page.locator(
    `[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`,
  );
  await expect(quizItem).not.toBeVisible();
});
