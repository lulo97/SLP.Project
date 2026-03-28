// e2e_tests/test/tests/quiz-attempt/attempt_quiz_1_fill_blank.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz with 1 fill‑in‑the‑blank question, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("Fill Blank Quiz");
  const questionContent = "The capital of France is Paris.";
  const correctAnswer = "Paris";
  const explanation = "Paris is the capital of France.";

  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Create an empty quiz
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page).toHaveURL(/\/quiz$/);

  const createFab = page.getByTestId("create-quiz-fab");
  await createFab.click();
  await expect(page).toHaveURL(/\/quiz\/new/);

  await page.getByTestId("quiz-title-input").fill(quizTitle);
  await page
    .getByTestId("quiz-description-input")
    .fill("Quiz to test fill‑in‑the‑blank attempt");
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

  // 3. Add a fill‑in‑the‑blank question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  await modal.getByTestId("question-title").fill(questionContent);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-fill-blank").click();

  // Fill the keyword (the word that will be replaced by ___)
  await modal.getByTestId("fill-blank-keyword").fill(correctAnswer);

  await modal.getByTestId("question-explanation").fill(explanation);
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

  // Click the Start button
  const startButton = page
    .locator(".ant-modal-footer")
    .getByRole("button", { name: "Start" });
  await startButton.click();

  // Wait for the player to load
  await expect(page.getByTestId("player-container")).toBeVisible();

  // 5. Answer the question
  const fillBlankInput = page.getByTestId("question-type-fill-blank");
  await expect(fillBlankInput).toBeVisible();
  await fillBlankInput.fill(correctAnswer);

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
  await expect(userAnswer).toContainText(correctAnswer);

  // Check the correct answer display (in the correct answer block)
  const correctAnswerBlock = page.getByTestId("review-user-answer-0");
  await expect(correctAnswerBlock).toContainText(correctAnswer);

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