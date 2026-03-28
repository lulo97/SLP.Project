// e2e_tests/test/tests/quiz-attempt/attempt_quiz_1_matching.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz with a matching question, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("Matching Quiz");
  const questionContent = "Match the countries with their capitals.";
  const pairs = [
    { left: "France", right: "Paris" },
    { left: "Germany", right: "Berlin" },
  ];

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
    .fill("Quiz to test matching attempt");
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

  // 3. Add a matching question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  await modal.getByTestId("question-title").fill(questionContent);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-matching").click();

  // Fill the first pair
  await modal.getByTestId("matching-left-0").fill(pairs[0].left);
  await modal.getByTestId("matching-right-0").fill(pairs[0].right);

  // Add second pair
  const addPairButton = modal.getByTestId("matching-add");
  await addPairButton.click();

  // Fill the second pair
  await modal.getByTestId("matching-left-1").fill(pairs[1].left);
  await modal.getByTestId("matching-right-1").fill(pairs[1].right);

  await modal
    .getByTestId("question-explanation")
    .fill("Match each country to its capital.");

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

  // 5. Answer the matching question
  const matchingComponent = page.getByTestId("question-type-matching");
  await expect(matchingComponent).toBeVisible();

  // Helper to match a pair
  const match = async (leftText: string, rightText: string) => {
    // Click left item
    const leftItem = matchingComponent
      .getByTestId("matching-left-column")
      .getByText(leftText, { exact: true });
    await leftItem.click();

    // Click right item
    const rightItem = matchingComponent
      .getByTestId("matching-right-column")
      .getByText(rightText, { exact: true });
    await rightItem.click();

    // Wait for auto-save to complete
    const autoSaveIndicator = page.getByTestId("auto-save-indicator");
    await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });
  };

  // Match first pair
  await match(pairs[0].left, pairs[0].right);

  // Progress should show 1/2
  const progress = matchingComponent.getByTestId("matching-progress");
  await expect(progress).toHaveText("1 / 2 matched");

  // Match second pair
  await match(pairs[1].left, pairs[1].right);

  // Verify all pairs matched
  const completeMessage = matchingComponent.getByTestId("matching-complete");
  await expect(completeMessage).toHaveText("✓ All pairs matched!");
  await expect(progress).toHaveText("2 / 2 matched");

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

  // Check the displayed user answer contains the correct matches
  const userAnswer = page.getByTestId("review-user-answer-0");
  await expect(userAnswer).toContainText("France → Paris");
  await expect(userAnswer).toContainText("Germany → Berlin");

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