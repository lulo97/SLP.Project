// e2e_tests/test/tests/quiz/add_edit_question_type.spec.ts
import { test, expect, Locator } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz, add a multiple-choice question, edit it to true/false, and delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("Quiz with MC -> TF");
  const mcQuestionContent = "What is the capital of France?";
  const tfQuestionContent = "The capital of France is Paris."; // after editing
  const option1 = "Berlin";
  const option2 = "Madrid";
  const option3 = "Paris";
  const option4 = "Lisbon";

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
    .fill("Quiz to test question type edit");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional: add a tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`type-edit-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 3. Add a multiple‑choice question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  await modal.getByTestId("question-title").fill(mcQuestionContent);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-multiple-choice").click();

  // Fill the four options
  await modal.getByTestId("mc-option-0-input").fill(option1);
  await modal.getByTestId("mc-option-1-input").fill(option2);
  await modal.getByTestId("mc-option-2-input").fill(option3);
  await modal.getByTestId("mc-option-3-input").fill(option4);

  // Mark the correct answer (Paris, index 2)
  await modal.getByTestId("mc-option-2-checkbox").check();

  await modal
    .getByTestId("question-explanation")
    .fill("Paris is the capital of France.");

  await modal.getByTestId("submit-question").click();
  await expect(modal).not.toBeVisible();

  // 4. Verify the question appears with the correct type tag
  const questionRow = page.locator(`div:has-text("${mcQuestionContent}")`).first();
  await expect(questionRow).toBeVisible();

  const typeTag = questionRow.getByTestId(/^question-type-tag-/);
  await expect(typeTag).toHaveText("Multiple Choice");

  // 5. Edit the question to true/false
  // Extract the question ID from the data-testid of the edit button
  // The edit button is inside the question row and has testid="edit-question-button-{id}"
  const editButton = questionRow.getByTestId(/^edit-question-button-/);
  const editTestId = await editButton.getAttribute("data-testid");
  const questionId = editTestId?.replace("edit-question-button-", "");
  if (!questionId) throw new Error("Could not extract question ID");

  await editButton.click();

  // Wait for modal to appear
  await expect(modal).toBeVisible();

  // Change question type to True/False
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-true-false").click();

  // Update the question content
  await modal.getByTestId("question-title").fill(tfQuestionContent);

  // Set the correct answer to True (since the statement is now correct)
  await modal.getByTestId("true-false-true").check();

  // Update explanation
  await modal
    .getByTestId("question-explanation")
    .fill("Paris is indeed the capital of France.");

  // Save changes
  await modal.getByTestId("submit-question").click();
  await expect(modal).not.toBeVisible();

  // 6. Verify the question now appears with the updated content and type
  const updatedRow = page.locator(`div:has-text("${tfQuestionContent}")`).first();
  await expect(updatedRow).toBeVisible();

  const updatedTypeTag = updatedRow.getByTestId(/^question-type-tag-/);
  await expect(updatedTypeTag).toHaveText("True False");

  // 7. Delete the quiz
  const deleteQuizButton = page.getByTestId("delete-quiz-button");
  await deleteQuizButton.click();

  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();

  // After deletion, redirected to quiz list
  await expect(page).toHaveURL(/\/quiz$/);

  // Switch to public tab and verify the quiz is gone
  await page.getByTestId("tab-public-quizzes").click();
  const searchInput = page.getByTestId("search-quizzes-input");
  await searchInput.fill(quizTitle);
  await searchInput.press("Enter");

  const quizItem = page.locator(
    `[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`
  );
  await expect(quizItem).not.toBeVisible();
});