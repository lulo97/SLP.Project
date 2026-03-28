// e2e_tests/test/tests/quiz-attempt/attempt_quiz_1_ordering.spec.ts
import { test, expect, Page, Locator } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

// Helper to drag an element onto another using mouse events
async function dragAndDrop(page: Page, source: Locator, target: Locator) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error("Could not get bounding boxes for drag and drop");
  }
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
  );
  await page.mouse.up();
}

test("admin can create a quiz with 1 ordering question, attempt it with drag-and-drop, submit, review, and delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("Ordering Quiz");
  const questionContent = "Arrange the steps in the correct order:";
  const items = ["First step", "Second step", "Third step"];

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
    .fill("Quiz to test ordering attempt");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`ordering-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page and extract quiz ID
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  const quizId = /\/quiz\/(\d+)/.exec(page.url())![1];
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // 3. Add an ordering question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  await modal.getByTestId("question-title").fill(questionContent);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-ordering").click();

  // Fill ordering items
  for (let i = 0; i < items.length; i++) {
    const itemInput = modal.getByTestId(`ordering-item-${i}`);
    await itemInput.fill(items[i]);
  }
  // Remove the extra fourth item (if present)
  const removeFourth = modal.getByTestId("ordering-remove-3");
  if (await removeFourth.isVisible()) {
    await removeFourth.click();
  }

  await modal
    .getByTestId("question-explanation")
    .fill("The steps must be in the correct order: first, second, third.");

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

  // Locate the ordering question component (the wrapper for the question type)
  const orderingComponent = page.getByTestId("question-type-ordering");
  await expect(orderingComponent).toBeVisible();

  // Ensure the correct number of items
  const orderingItems = orderingComponent.locator(
    '[data-testid^="ordering-row-"]',
  );
  await expect(orderingItems).toHaveCount(items.length);

  // 5. Reorder the items to a SPECIFIC incorrect order:
  // [Third, First, Second]
  const targetOrder = ["Third step", "First step", "Second step"];

  for (let i = 0; i < targetOrder.length; i++) {
    const textToMove = targetOrder[i];

    // Find the item that currently holds our target text
    const sourceRow = orderingComponent
      .locator('[data-testid^="ordering-row-"]')
      .filter({ hasText: textToMove });

    // Find the row currently sitting at the index we want to fill
    const targetRow = orderingComponent
      .locator('[data-testid^="ordering-row-"]')
      .nth(i);

    // Get the handle of the source and drag it to the target row
    const handle = sourceRow.getByTestId(/^ordering-drag-handle-/);

    // Using dragTo is more robust for SortableJS/v-draggable-next
    await handle.dragTo(targetRow);

    // Small sleep to allow the DOM to re-order and animations to finish
    await page.waitForTimeout(200);
  }

  // Wait for auto-save
  const autoSaveIndicator = page.getByTestId("auto-save-indicator");
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });

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

  // 7. Verify review page content – score should be 0/1 because the reorder is wrong
  const scoreValue = page.getByTestId("score-value");
  await expect(scoreValue).toHaveText("0 / 1");

  const scorePercent = page.getByTestId("score-percent");
  await expect(scorePercent).toHaveText("0%");

  const correctCount = page.getByTestId("correct-count");
  const incorrectCount = page.getByTestId("incorrect-count");
  await expect(correctCount).toHaveText("0 correct");
  await expect(incorrectCount).toHaveText("1 incorrect");

  // Verify the question card indicates incorrect answer
  const questionCard = page.getByTestId("review-question-0");
  await expect(questionCard).toHaveAttribute("data-correct", "false");

  // Check the displayed user answer contains the reordered list
  const userAnswerDiv = page.getByTestId("review-user-answer-0");
  await expect(userAnswerDiv).toContainText("1. Third step");
  await expect(userAnswerDiv).toContainText("2. First step");
  await expect(userAnswerDiv).toContainText("3. Second step");

  // Check the correct answer block contains the original order
  const correctAnswerDiv = page.getByTestId("review-correct-answer-0");
  await expect(correctAnswerDiv).toContainText("1. First step");
  await expect(correctAnswerDiv).toContainText("2. Second step");
  await expect(correctAnswerDiv).toContainText("3. Third step");

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
