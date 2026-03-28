// e2e_tests/test/tests/quiz-attempt/attempt_quiz_5_all_types.spec.ts
import { test, expect, Locator } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz with all 5 question types, attempt it, answer only MC wrong, score 4/5, and delete the quiz", async ({
  page,
}) => {
  test.setTimeout(180000); 

  const quizTitle = getUniqueTitle("Full Quiz Attempt");

  // ---------- Question definitions ----------
  const mcQuestion = "What is the capital of France?";
  const mcOptions = ["Berlin", "Madrid", "Paris", "Lisbon"];
  const mcCorrect = "Paris";
  const mcWrong = "Berlin";

  const tfQuestion = "Paris is the capital of France.";
  const tfCorrectAnswer = true; // true → True

  const fbQuestion = "The capital of France is Paris.";
  const fbKeyword = "Paris";

  const orderingQuestion = "Arrange the planets in order from the Sun:";
  const orderingItems = ["Mercury", "Venus", "Earth"];

  const matchingQuestion = "Match the country with its capital:";
  const matchingPairs = [
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
    .fill("Quiz with all five question types");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`full-attempt-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page and extract quiz ID
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  const quizId = /\/quiz\/(\d+)/.exec(page.url())![1];
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // Helper to open question modal
  const openQuestionModal = async () => {
    await page.getByTestId("add-question-button").click();
    const modal = page.getByTestId("question-form-modal");
    await expect(modal).toBeVisible();
    return modal;
  };

  // Helper to submit question and close modal
  const submitQuestion = async (modal: Locator) => {
    await modal.getByTestId("submit-question").click();
    await expect(modal).not.toBeVisible();
  };

  // 3. Add multiple‑choice question
  let modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(mcQuestion);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-multiple-choice").click();

  // Fill options
  for (let i = 0; i < mcOptions.length; i++) {
    await modal.getByTestId(`mc-option-${i}-input`).fill(mcOptions[i]);
  }
  // Mark correct answer (index of "Paris")
  const correctIndex = mcOptions.indexOf(mcCorrect);
  await modal.getByTestId(`mc-option-${correctIndex}-checkbox`).check();

  await modal
    .getByTestId("question-explanation")
    .fill("Paris is the capital of France.");
  await submitQuestion(modal);
  await expect(
    page.locator(`div:has-text("${mcQuestion}")`).first(),
  ).toBeVisible();

  // 4. Add true/false question
  modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(tfQuestion);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-true-false").click();

  if (tfCorrectAnswer) {
    await modal.getByTestId("true-false-true").check();
  } else {
    await modal.getByTestId("true-false-false").check();
  }

  await modal
    .getByTestId("question-explanation")
    .fill("Paris is indeed the capital of France.");
  await submitQuestion(modal);
  await expect(
    page.locator(`div:has-text("${tfQuestion}")`).first(),
  ).toBeVisible();

  // 5. Add fill‑in‑the‑blank question
  modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(fbQuestion);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-fill-blank").click();

  await modal.getByTestId("fill-blank-keyword").fill(fbKeyword);

  await modal
    .getByTestId("question-explanation")
    .fill("Paris is the capital of France.");
  await submitQuestion(modal);
  await expect(
    page.locator(`div:has-text("${fbQuestion}")`).first(),
  ).toBeVisible();

  // 6. Add ordering question
  modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(orderingQuestion);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-ordering").click();

  for (let i = 0; i < orderingItems.length; i++) {
    await modal.getByTestId(`ordering-item-${i}`).fill(orderingItems[i]);
  }
  // Remove the extra fourth item if present
  const removeFourth = modal.getByTestId("ordering-remove-3");
  if (await removeFourth.isVisible()) {
    await removeFourth.click();
  }

  await modal
    .getByTestId("question-explanation")
    .fill("Correct order: Mercury, Venus, Earth.");
  await submitQuestion(modal);
  await expect(
    page.locator(`div:has-text("${orderingQuestion}")`).first(),
  ).toBeVisible();

  // 7. Add matching question
  modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(matchingQuestion);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-matching").click();

  // First pair
  await modal.getByTestId("matching-left-0").fill(matchingPairs[0].left);
  await modal.getByTestId("matching-right-0").fill(matchingPairs[0].right);

  // Add second pair
  const addPairBtn = modal.getByTestId("matching-add");
  await addPairBtn.click();

  // Fill second pair (index 1)
  await modal.getByTestId("matching-left-1").fill(matchingPairs[1].left);
  await modal.getByTestId("matching-right-1").fill(matchingPairs[1].right);

  await modal
    .getByTestId("question-explanation")
    .fill("Match countries to their capitals.");
  await submitQuestion(modal);
  await expect(
    page.locator(`div:has-text("${matchingQuestion}")`).first(),
  ).toBeVisible();

  // Verify total questions count
  const totalSpan = page.getByTestId("questions-total");
  await expect(totalSpan).toHaveText("Total: 5");

  // 8. Start a new attempt
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

  const autoSaveIndicator = page.getByTestId("auto-save-indicator");

  // 9. Answer the questions (only MC wrong)

  // ---- Multiple Choice (wrong) ----
  const mcGroup = page.getByTestId("question-type-multiple-choice");
  await expect(mcGroup).toBeVisible();

  // Select the wrong option (Berlin)
  const wrongCheckbox = page.getByRole("checkbox", { name: mcWrong });
  await wrongCheckbox.check();
  await expect(wrongCheckbox).toBeChecked();

  // Wait for auto‑save
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });

  // Go to next question
  await page.getByTestId("next-question").click();

  // ---- True/False (correct) ----
  const tfGroup = page.getByTestId("question-type-true-false");
  await expect(tfGroup).toBeVisible();

  const trueRadio = page.getByTestId("true-false-option-true");
  await trueRadio.check();
  await expect(trueRadio).toBeChecked();
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });
  await page.getByTestId("next-question").click();

  // ---- Fill Blank (correct) ----
  const fbInput = page.getByTestId("question-type-fill-blank");
  await expect(fbInput).toBeVisible();

  await fbInput.fill(fbKeyword);
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });
  await page.getByTestId("next-question").click();

  // ---- Ordering (correct, initial order is already correct) ----
  const orderingComponent = page.getByTestId("question-type-ordering");
  await expect(orderingComponent).toBeVisible();

  // Optionally verify the order (if needed, but not required)
  // The initial order should be the correct one, so we just wait for auto‑save
  // (The component auto‑saves when mounted, so we can proceed)
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });
  await page.getByTestId("next-question").click();

  // ---- Matching (correct) ----
  const matchingComponent = page.getByTestId("question-type-matching");
  await expect(matchingComponent).toBeVisible();

  // Helper to match a pair
  const match = async (leftText: string, rightText: string) => {
    const leftItem = matchingComponent
      .getByTestId("matching-left-column")
      .getByText(leftText, { exact: true });
    const rightItem = matchingComponent
      .getByTestId("matching-right-column")
      .getByText(rightText, { exact: true });
    await leftItem.click();
    await rightItem.click();
    await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });
  };

  // Match both pairs
  await match(matchingPairs[0].left, matchingPairs[0].right);
  await match(matchingPairs[1].left, matchingPairs[1].right);

  // Verify all pairs matched
  const progress = matchingComponent.getByTestId("matching-progress");
  await expect(progress).toHaveText(`2 / 2 matched`);

  // 10. Submit the attempt
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

  // 11. Verify review page content (score 4/5)
  const scoreValue = page.getByTestId("score-value");
  await expect(scoreValue).toHaveText("4 / 5");

  const scorePercent = page.getByTestId("score-percent");
  await expect(scorePercent).toHaveText("80%");

  const correctCount = page.getByTestId("correct-count");
  const incorrectCount = page.getByTestId("incorrect-count");
  await expect(correctCount).toHaveText("4 correct");
  await expect(incorrectCount).toHaveText("1 incorrect");

  // Verify each question's correctness
  // Question 0: Multiple Choice (should be incorrect)
  const mcCard = page.getByTestId("review-question-0");
  await expect(mcCard).toHaveAttribute("data-correct", "false");
  const mcUserAnswer = page.getByTestId("review-user-answer-0");
  await expect(mcUserAnswer).toContainText(mcWrong);

  // Question 1: True/False (correct)
  const tfCard = page.getByTestId("review-question-1");
  await expect(tfCard).toHaveAttribute("data-correct", "true");
  const tfUserAnswer = page.getByTestId("review-user-answer-1");
  await expect(tfUserAnswer).toContainText("True");

  // Question 2: Fill Blank (correct)
  const fbCard = page.getByTestId("review-question-2");
  await expect(fbCard).toHaveAttribute("data-correct", "true");
  const fbUserAnswer = page.getByTestId("review-user-answer-2");
  await expect(fbUserAnswer).toContainText(fbKeyword);

  // Question 3: Ordering (correct)
  const orderCard = page.getByTestId("review-question-3");
  await expect(orderCard).toHaveAttribute("data-correct", "true");
  const orderUserAnswer = page.getByTestId("review-user-answer-3");
  // Expect the original order to be displayed
  await expect(orderUserAnswer).toContainText("1. Mercury");
  await expect(orderUserAnswer).toContainText("2. Venus");
  await expect(orderUserAnswer).toContainText("3. Earth");

  // Question 4: Matching (correct)
  const matchCard = page.getByTestId("review-question-4");
  await expect(matchCard).toHaveAttribute("data-correct", "true");
  const matchUserAnswer = page.getByTestId("review-user-answer-4");
  await expect(matchUserAnswer).toContainText("France → Paris");
  await expect(matchUserAnswer).toContainText("Germany → Berlin");

  // 12. Go back to quiz detail and delete the quiz
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