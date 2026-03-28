// e2e_tests/test/tests/quiz-attempt/attempt_quiz_2_multiple_choice.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz with 2 multiple-choice questions, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("2 MC Quiz");
  const q1Content = "What is the capital of France?";
  const q1Correct = "Paris";
  const q1Options = ["Berlin", "Madrid", "Paris", "Lisbon"];
  const q2Content = "What is the capital of Germany?";
  const q2Correct = "Berlin";
  const q2Options = ["Paris", "Berlin", "Munich", "Frankfurt"];

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
    .fill("Quiz to test two multiple-choice questions");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`mc2-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page and extract quiz ID
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  const quizId = /\/quiz\/(\d+)/.exec(page.url())![1];
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // Helper to add a multiple-choice question
  const addMultipleChoiceQuestion = async (
    content: string,
    options: string[],
    correctOption: string
  ) => {
    const addButton = page.getByTestId("add-question-button");
    await addButton.click();

    const modal = page.getByTestId("question-form-modal");
    await expect(modal).toBeVisible();

    await modal.getByTestId("question-title").fill(content);
    await modal.getByTestId("question-type-select").click();
    await page.getByTestId("option-multiple-choice").click();

    // Fill options (up to 4)
    for (let i = 0; i < options.length; i++) {
      await modal.getByTestId(`mc-option-${i}-input`).fill(options[i]);
    }
    // Mark the correct option
    const correctIndex = options.indexOf(correctOption);
    if (correctIndex === -1) throw new Error(`Correct option "${correctOption}" not found in options`);
    await modal.getByTestId(`mc-option-${correctIndex}-checkbox`).check();

    await modal
      .getByTestId("question-explanation")
      .fill(`Explanation: ${correctOption} is the capital.`);

    await modal.getByTestId("submit-question").click();
    await expect(modal).not.toBeVisible();
  };

  // 3. Add first multiple‑choice question
  await addMultipleChoiceQuestion(q1Content, q1Options, q1Correct);

  // Verify first question appears
  await expect(
    page.locator(`div:has-text("${q1Content}")`).first(),
  ).toBeVisible();

  // 4. Add second multiple‑choice question
  await addMultipleChoiceQuestion(q2Content, q2Options, q2Correct);

  // Verify second question appears
  await expect(
    page.locator(`div:has-text("${q2Content}")`).first(),
  ).toBeVisible();

  // 5. Start a new attempt
  await page.goto(`${FRONTEND_URL}/quiz/${quizId}/attempt`);

  // Start modal appears
  const startModal = page.getByTestId("start-options-modal");
  await expect(startModal).toBeVisible();

  // Click the Start button (the only button in the modal footer)
  const startButton = page
    .locator(".ant-modal-footer")
    .getByRole("button", { name: "Start" });
  await startButton.click();

  // Wait for the player to load
  await expect(page.getByTestId("player-container")).toBeVisible();

  // 6. Answer both questions

  // First question
  const mcGroup1 = page.getByTestId("question-type-multiple-choice");
  await expect(mcGroup1).toBeVisible();

  const correctCheckbox1 = page.getByRole("checkbox", {
    name: q1Correct,
  });
  await correctCheckbox1.check();
  await expect(correctCheckbox1).toBeChecked();

  // Wait for auto-save
  const autoSaveIndicator = page.getByTestId("auto-save-indicator");
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });

  // Go to next question
  const nextButton = page.getByTestId("next-question");
  await nextButton.click();

  // Second question
  const mcGroup2 = page.getByTestId("question-type-multiple-choice");
  await expect(mcGroup2).toBeVisible();

  const correctCheckbox2 = page.getByRole("checkbox", {
    name: q2Correct,
  });
  await correctCheckbox2.check();
  await expect(correctCheckbox2).toBeChecked();

  // Wait for auto-save
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });

  // 7. Submit the attempt
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

  // 8. Verify review page content
  const scoreValue = page.getByTestId("score-value");
  await expect(scoreValue).toHaveText("2 / 2");

  const scorePercent = page.getByTestId("score-percent");
  await expect(scorePercent).toHaveText("100%");

  const correctCount = page.getByTestId("correct-count");
  const incorrectCount = page.getByTestId("incorrect-count");
  await expect(correctCount).toHaveText("2 correct");
  await expect(incorrectCount).toHaveText("0 incorrect");

  // Verify each question card indicates correct answer
  for (let i = 0; i < 2; i++) {
    const questionCard = page.getByTestId(`review-question-${i}`);
    await expect(questionCard).toHaveAttribute("data-correct", "true");

    // Check the displayed user answer contains the correct text
    const userAnswer = page.getByTestId(`review-user-answer-${i}`);
    if (i === 0) {
      await expect(userAnswer).toContainText(q1Correct);
    } else {
      await expect(userAnswer).toContainText(q2Correct);
    }
  }

  // 9. Go back to quiz detail and delete the quiz
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