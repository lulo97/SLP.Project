
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz, add a multiple‑choice and a true/false question, then delete the quiz", async ({ page }) => {
  const quizTitle = getUniqueTitle("Quiz with MC and TF questions");
  const mcQuestion = "What is the capital of France?";
  const correctOption = "Paris";
  const tfQuestion = "The capital of France is Berlin.";
  const tfCorrectAnswer = "false"; // because Berlin is not the capital

  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Create an empty quiz
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page).toHaveURL(/\/quiz$/);

  const createFab = page.getByTestId("create-quiz-fab");
  await createFab.click();
  await expect(page).toHaveURL(/\/quiz\/new/);

  await page.getByTestId("quiz-title-input").fill(quizTitle);
  await page.getByTestId("quiz-description-input").fill("Quiz with two questions");
  await page.getByTestId("quiz-visibility-public").check();

  // Add a tag (optional)
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`multi-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 3. Add a multiple‑choice question
  await page.getByTestId("add-question-button").click();
  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  await modal.getByTestId("question-title").fill(mcQuestion);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-multiple-choice").click();

  // Fill options (Berlin, Madrid, Paris, Lisbon)
  await modal.getByTestId("mc-option-0-input").fill("Berlin");
  await modal.getByTestId("mc-option-1-input").fill("Madrid");
  await modal.getByTestId("mc-option-2-input").fill(correctOption);
  await modal.getByTestId("mc-option-3-input").fill("Lisbon");

  // Mark the correct answer (third option)
  await modal.getByTestId("mc-option-2-checkbox").check();

  await modal.getByTestId("question-explanation").fill("Paris is the capital of France.");
  await modal.getByTestId("submit-question").click();

  await expect(modal).not.toBeVisible();
  // Verify the question appears
  await expect(page.locator(`div:has-text("${mcQuestion}")`).first()).toBeVisible();

  // 4. Add a true/false question
  await page.getByTestId("add-question-button").click();
  await expect(modal).toBeVisible();

  await modal.getByTestId("question-title").fill(tfQuestion);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-true-false").click();

  // Select "False" as the correct answer
  await modal.getByTestId("true-false-false").check();

  await modal.getByTestId("question-explanation").fill("Berlin is not the capital of France; Paris is.");
  await modal.getByTestId("submit-question").click();

  await expect(modal).not.toBeVisible();
  await expect(page.locator(`div:has-text("${tfQuestion}")`).first()).toBeVisible();

  // 5. Delete the quiz
  await page.getByTestId("delete-quiz-button").click();
  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();

  // After deletion, we are back on the quiz list
  await expect(page).toHaveURL(/\/quiz$/);

  // Switch to public tab and search for the quiz to ensure it's gone
  await page.getByTestId("tab-public-quizzes").click();
  const searchInput = page.getByTestId("search-quizzes-input");
  await searchInput.fill(quizTitle);
  await searchInput.press("Enter");

  const quizItem = page.locator(`[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`);
  await expect(quizItem).not.toBeVisible();
});