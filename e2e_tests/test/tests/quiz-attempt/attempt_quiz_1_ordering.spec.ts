
import { test, expect, Page, Locator } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle } from "../question/utils";
import {
  createEmptyQuiz,
  startAttempt,
  submitAttempt,
  deleteQuiz,
  addOrderingQuestion,
} from "./utils";

// Helper to drag an element onto another using mouse events (kept because drag-and-drop is complex)
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
test.setTimeout(180000);

  const quizTitle = getUniqueTitle("Ordering Quiz");
  const questionContent = "Arrange the steps in the correct order:";
  const items = ["First step", "Second step", "Third step"];

  await loginAsAdmin(page);
  const quizId = await createEmptyQuiz(
    page,
    quizTitle,
    "Quiz to test ordering attempt",
    `ordering-${Date.now()}`
  );

  await addOrderingQuestion(
    page,
    questionContent,
    items,
    "The steps must be in the correct order: first, second, third."
  );

  await startAttempt(page, quizId);

  // Locate the ordering question component
  const orderingComponent = page.getByTestId("question-type-ordering");
  await expect(orderingComponent).toBeVisible();

  // Ensure the correct number of items
  const orderingItems = orderingComponent.locator('[data-testid^="ordering-row-"]');
  await expect(orderingItems).toHaveCount(items.length);

  // Reorder the items to a specific incorrect order: [Third, First, Second]
  const targetOrder = ["Third step", "First step", "Second step"];

  for (let i = 0; i < targetOrder.length; i++) {
    const textToMove = targetOrder[i];
    const sourceRow = orderingComponent
      .locator('[data-testid^="ordering-row-"]')
      .filter({ hasText: textToMove });
    const targetRow = orderingComponent
      .locator('[data-testid^="ordering-row-"]')
      .nth(i);
    const handle = sourceRow.getByTestId(/^ordering-drag-handle-/);
    await handle.dragTo(targetRow);
    await page.waitForTimeout(200);
  }

  // Wait for auto-save
  const autoSaveIndicator = page.getByTestId("auto-save-indicator");
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });

  await submitAttempt(page);

  // Verify review page content – score should be 0/1
  await expect(page.getByTestId("score-value")).toHaveText("0 / 1");
  await expect(page.getByTestId("score-percent")).toHaveText("0%");
  await expect(page.getByTestId("correct-count")).toHaveText("0 correct");
  await expect(page.getByTestId("incorrect-count")).toHaveText("1 incorrect");

  const questionCard = page.getByTestId("review-question-0");
  await expect(questionCard).toHaveAttribute("data-correct", "false");

  const userAnswerDiv = page.getByTestId("review-user-answer-0");
  await expect(userAnswerDiv).toContainText("1. Third step");
  await expect(userAnswerDiv).toContainText("2. First step");
  await expect(userAnswerDiv).toContainText("3. Second step");

  const correctAnswerDiv = page.getByTestId("review-correct-answer-0");
  await expect(correctAnswerDiv).toContainText("1. First step");
  await expect(correctAnswerDiv).toContainText("2. Second step");
  await expect(correctAnswerDiv).toContainText("3. Third step");

  await page.getByTestId("back-to-quiz").click();
  await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}$`));

  await deleteQuiz(page, quizId, quizTitle);
});