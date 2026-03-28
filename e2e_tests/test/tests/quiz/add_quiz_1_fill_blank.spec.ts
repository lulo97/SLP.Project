
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz, add a fill‑in‑the‑blank question, and delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("Quiz with Fill Blank");
  const questionContent = "The capital of France is Paris.";
  const keyword = "Paris";

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
    .fill("Quiz with a fill‑in‑the‑blank question");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`fillblank-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // Verify the quiz has no questions initially
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 3. Add a fill‑in‑the‑blank question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  // Wait for the modal to appear
  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  // Fill question title
  await modal.getByTestId("question-title").fill(questionContent);

  // Select "Fill Blank" type
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-fill-blank").click();

  // Fill the keyword in the FillBlank component
  const keywordInput = modal.getByTestId("fill-blank-keyword");
  await keywordInput.fill(keyword);

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
  // The question content should be visible in the questions section
  const questionItem = page
    .locator(`div:has-text("${questionContent}")`)
    .first();
  await expect(questionItem).toBeVisible();

  // Optional: verify that the no-questions-message is gone
  await expect(page.getByTestId("no-questions-message")).not.toBeVisible();

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