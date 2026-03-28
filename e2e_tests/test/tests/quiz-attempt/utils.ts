
import { Page, expect, Locator } from "@playwright/test";
import { FRONTEND_URL } from "../question/utils";

/**
 * Creates an empty quiz with given title, description, and optional tag.
 * Returns the newly created quiz ID.
 */
export async function createEmptyQuiz(
  page: Page,
  quizTitle: string,
  description: string,
  tag?: string
): Promise<string> {
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page).toHaveURL(/\/quiz$/);
  await page.getByTestId("create-quiz-fab").click();
  await expect(page).toHaveURL(/\/quiz\/new/);

  await page.getByTestId("quiz-title-input").fill(quizTitle);
  await page.getByTestId("quiz-description-input").fill(description);
  await page.getByTestId("quiz-visibility-public").check();

  if (tag) {
    const tagSelector = page.getByTestId("tag-selector");
    await tagSelector.click();
    const tagInput = tagSelector.locator("input");
    await tagInput.fill(tag);
    await tagInput.press("Enter");
    await tagInput.press("Escape");
  }

  await page.getByTestId("quiz-submit-button").click();
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  const quizId = /\/quiz\/(\d+)/.exec(page.url())![1];
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
  return quizId;
}

/**
 * Starts an attempt on a quiz: navigates to the attempt URL, clicks the Start button,
 * and waits for the player to load.
 */
export async function startAttempt(page: Page, quizId: string) {
  await page.goto(`${FRONTEND_URL}/quiz/${quizId}/attempt`);
  const startModal = page.getByTestId("start-options-modal");
  await expect(startModal).toBeVisible();
  const startButton = page
    .locator(".ant-modal-footer")
    .getByRole("button", { name: "Start" });
  await startButton.click();
  await expect(page.getByTestId("player-container")).toBeVisible();
}

/**
 * Submits the current attempt: clicks submit button, confirms, and waits for review page.
 */
export async function submitAttempt(page: Page) {
  await page.getByTestId("submit-attempt").click();
  const submitModal = page.getByTestId("submit-modal-message");
  await expect(submitModal).toBeVisible();
  const confirmSubmit = page
    .locator(".ant-modal-footer")
    .getByRole("button", { name: "Yes, submit" });
  await confirmSubmit.click();
  await expect(page).toHaveURL(/\/quiz\/attempt\/\d+\/review/);
  await expect(page.getByTestId("review-container")).toBeVisible();
}

/**
 * Verifies the overall score and counts on the review page.
 */
export async function verifyReviewScore(
  page: Page,
  expectedScore: number,
  expectedTotal: number,
  expectedCorrect: number,
  expectedIncorrect: number
) {
  await expect(page.getByTestId("score-value")).toHaveText(
    `${expectedScore} / ${expectedTotal}`
  );
  await expect(page.getByTestId("score-percent")).toHaveText(
    `${Math.round((expectedScore / expectedTotal) * 100)}%`
  );
  await expect(page.getByTestId("correct-count")).toHaveText(
    `${expectedCorrect} correct`
  );
  await expect(page.getByTestId("incorrect-count")).toHaveText(
    `${expectedIncorrect} incorrect`
  );
}

/**
 * Deletes a quiz from its detail page and verifies it is removed from the list.
 * Assumes the current page is the quiz detail page.
 */
export async function deleteQuiz(page: Page, quizId: string, quizTitle: string) {
  const deleteQuizButton = page.getByTestId("delete-quiz-button");
  await deleteQuizButton.click();
  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();
  await expect(page).toHaveURL(/\/quiz$/);

  await page.getByTestId("tab-public-quizzes").click();
  const searchInput = page.getByTestId("search-quizzes-input");
  await searchInput.fill(quizTitle);
  await searchInput.press("Enter");
  const quizItem = page.locator(
    `[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`
  );
  await expect(quizItem).not.toBeVisible();
}

/**
 * Helper to open the question form modal.
 */
async function openQuestionModal(page: Page): Promise<Locator> {
  await page.getByTestId("add-question-button").click();
  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();
  return modal;
}

/**
 * Submits the question form and waits for the modal to close.
 */
async function submitQuestionModal(modal: Locator) {
  await modal.getByTestId("submit-question").click();
  await expect(modal).not.toBeVisible();
}

/**
 * Adds a multiple‑choice question.
 */
export async function addMultipleChoiceQuestion(
  page: Page,
  content: string,
  options: string[],
  correctOption: string,
  explanation?: string
) {
  const modal = await openQuestionModal(page);
  await modal.getByTestId("question-title").fill(content);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-multiple-choice").click();

  for (let i = 0; i < options.length; i++) {
    await modal.getByTestId(`mc-option-${i}-input`).fill(options[i]);
  }
  const correctIndex = options.indexOf(correctOption);
  if (correctIndex === -1) {
    throw new Error(`Correct option "${correctOption}" not found in options`);
  }
  await modal.getByTestId(`mc-option-${correctIndex}-checkbox`).check();

  if (explanation) {
    await modal.getByTestId("question-explanation").fill(explanation);
  }
  await submitQuestionModal(modal);
  await expect(page.locator(`div:has-text("${content}")`).first()).toBeVisible();
}

/**
 * Adds a true/false question.
 */
export async function addTrueFalseQuestion(
  page: Page,
  content: string,
  isTrue: boolean,
  explanation?: string
) {
  const modal = await openQuestionModal(page);
  await modal.getByTestId("question-title").fill(content);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-true-false").click();

  if (isTrue) {
    await modal.getByTestId("true-false-true").check();
  } else {
    await modal.getByTestId("true-false-false").check();
  }

  if (explanation) {
    await modal.getByTestId("question-explanation").fill(explanation);
  }
  await submitQuestionModal(modal);
  await expect(page.locator(`div:has-text("${content}")`).first()).toBeVisible();
}

/**
 * Adds a fill‑in‑the‑blank question.
 */
export async function addFillBlankQuestion(
  page: Page,
  content: string,
  keyword: string,
  explanation?: string
) {
  const modal = await openQuestionModal(page);
  await modal.getByTestId("question-title").fill(content);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-fill-blank").click();

  await modal.getByTestId("fill-blank-keyword").fill(keyword);

  if (explanation) {
    await modal.getByTestId("question-explanation").fill(explanation);
  }
  await submitQuestionModal(modal);
  await expect(page.locator(`div:has-text("${content}")`).first()).toBeVisible();
}

/**
 * Adds an ordering question.
 */
export async function addOrderingQuestion(
  page: Page,
  content: string,
  items: string[],
  explanation?: string
) {
  const modal = await openQuestionModal(page);
  await modal.getByTestId("question-title").fill(content);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-ordering").click();

  for (let i = 0; i < items.length; i++) {
    await modal.getByTestId(`ordering-item-${i}`).fill(items[i]);
  }
  // Remove extra item if present (max 4 items)
  const removeFourth = modal.getByTestId("ordering-remove-3");
  if (await removeFourth.isVisible()) {
    await removeFourth.click();
  }

  if (explanation) {
    await modal.getByTestId("question-explanation").fill(explanation);
  }
  await submitQuestionModal(modal);
  await expect(page.locator(`div:has-text("${content}")`).first()).toBeVisible();
}

/**
 * Adds a matching question.
 */
export async function addMatchingQuestion(
  page: Page,
  content: string,
  pairs: Array<{ left: string; right: string }>,
  explanation?: string
) {
  const modal = await openQuestionModal(page);
  await modal.getByTestId("question-title").fill(content);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-matching").click();

  // Fill first pair
  await modal.getByTestId("matching-left-0").fill(pairs[0].left);
  await modal.getByTestId("matching-right-0").fill(pairs[0].right);

  // Add additional pairs
  for (let i = 1; i < pairs.length; i++) {
    const addPairBtn = modal.getByTestId("matching-add");
    await addPairBtn.click();
    await modal.getByTestId(`matching-left-${i}`).fill(pairs[i].left);
    await modal.getByTestId(`matching-right-${i}`).fill(pairs[i].right);
  }

  if (explanation) {
    await modal.getByTestId("question-explanation").fill(explanation);
  }
  await submitQuestionModal(modal);
  await expect(page.locator(`div:has-text("${content}")`).first()).toBeVisible();
}

/**
 * Answers a multiple‑choice question by checking the option with the given text.
 */
export async function answerMultipleChoice(page: Page, optionText: string) {
  const mcGroup = page.getByTestId("question-type-multiple-choice");
  await expect(mcGroup).toBeVisible();
  const checkbox = page.getByRole("checkbox", { name: optionText });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await waitForAutoSave(page);
}

/**
 * Answers a true/false question.
 */
export async function answerTrueFalse(page: Page, value: boolean) {
  const tfGroup = page.getByTestId("question-type-true-false");
  await expect(tfGroup).toBeVisible();
  const radio = page.getByTestId(value ? "true-false-option-true" : "true-false-option-false");
  await radio.check();
  await expect(radio).toBeChecked();
  await waitForAutoSave(page);
}

/**
 * Answers a fill‑in‑the‑blank question.
 */
export async function answerFillBlank(page: Page, answer: string) {
  const input = page.getByTestId("question-type-fill-blank");
  await expect(input).toBeVisible();
  await input.fill(answer);
  await waitForAutoSave(page);
}

/**
 * Matches a pair in a matching question.
 */
export async function matchPair(page: Page, left: string, right: string) {
  const matchingComponent = page.getByTestId("question-type-matching");
  const leftItem = matchingComponent
    .getByTestId("matching-left-column")
    .getByText(left, { exact: true });
  const rightItem = matchingComponent
    .getByTestId("matching-right-column")
    .getByText(right, { exact: true });
  await leftItem.click();
  await rightItem.click();
  await waitForAutoSave(page);
}

/**
 * Waits for the auto-save indicator to show "Saved".
 */
async function waitForAutoSave(page: Page) {
  const autoSaveIndicator = page.getByTestId("auto-save-indicator");
  await expect(autoSaveIndicator).toHaveText("Saved", { timeout: 5000 });
}

/**
 * Navigates to the next question in the attempt player.
 */
export async function goToNextQuestion(page: Page) {
  await page.getByTestId("next-question").click();
}