// e2e_tests/test/tests/quiz/add_quiz_1_matching.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz, add a matching question, and delete the quiz", async ({
  page,
}) => {
  const quizTitle = getUniqueTitle("Quiz with Matching Question");
  const questionContent = "Match the countries with their capitals.";
  const left1 = "France";
  const right1 = "Paris";
  const left2 = "Germany";
  const right2 = "Berlin";

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
    .fill("Quiz with a matching question");
  await page.getByTestId("quiz-visibility-public").check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`matching-quiz-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // Verify the quiz has no questions initially
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // 3. Add a matching question
  const addQuestionButton = page.getByTestId("add-question-button");
  await addQuestionButton.click();

  // Wait for the modal to appear
  const modal = page.getByTestId("question-form-modal");
  await expect(modal).toBeVisible();

  // Fill question title
  await modal.getByTestId("question-title").fill(questionContent);

  // Select "Matching" type
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-matching").click();

  // Fill the matching pairs
  // By default there is one pair (index 0). Add a second pair using the "Add Pair" button.
  const left0 = modal.getByTestId("matching-left-0");
  const right0 = modal.getByTestId("matching-right-0");
  await left0.fill(left1);
  await right0.fill(right1);

  // Add second pair
  const addPairButton = modal.getByTestId("matching-add");
  await addPairButton.click();
  // Now there should be a second pair (index 1)
  const left1Input = modal.getByTestId("matching-left-1");
  const right1Input = modal.getByTestId("matching-right-1");
  await left1Input.fill(left2);
  await right1Input.fill(right2);

  // Optional: add explanation
  await modal
    .getByTestId("question-explanation")
    .fill("Matching capitals to countries.");

  // Submit the question
  const submitQuestionButton = modal.getByTestId("submit-question");
  await submitQuestionButton.click();

  // Wait for modal to close
  await expect(modal).not.toBeVisible();

  // 4. Verify the question appears in the list
  const questionItem = page
    .locator(`div:has-text("${questionContent}")`)
    .first();
  await expect(questionItem).toBeVisible();

  // Optional: verify the summary shows the number of pairs
  // The summary is rendered by getQuestionSummary and should contain "Matching (2 pairs)"
  const questionSummary = questionItem.locator(".text-xs.text-gray-500");
  await expect(questionSummary).toContainText("Matching (2 pairs)");

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