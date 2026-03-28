// e2e_tests/test/tests/quiz/add_quiz_5_questions.spec.ts
import { test, expect, Locator } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz with 5 different question types and delete it", async ({
  page,
}) => {
  test.setTimeout(120000); 
  
  const quizTitle = getUniqueTitle("Full Quiz");
  const questionMC = "What is the capital of France?";
  const optionCorrect = "Paris";
  const questionTF = "The capital of France is Berlin.";
  const tfCorrect = "false";
  const questionFB = "The capital of France is Paris.";
  const fbKeyword = "Paris";
  const questionOrder = "Arrange the planets by distance from the Sun:";
  const orderItems = ["Mercury", "Venus", "Earth"];
  const questionMatch = "Match the country with its capital:";
  const matchPairs = [
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
    .fill("Quiz with five different question types");
  await page.getByTestId("quiz-visibility-public").check();

  // Add a tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`full-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();

  // Wait for redirect to quiz detail page
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
  await expect(page.getByTestId("no-questions-message")).toBeVisible();

  // Helper to open question modal
  const openQuestionModal = async () => {
    await page.getByTestId("add-question-button").click();
    const modal = page.getByTestId("question-form-modal");
    await expect(modal).toBeVisible();
    return modal;
  };

  // Helper to submit and close modal
  const submitQuestion = async (modal: Locator) => {
    await modal.getByTestId("submit-question").click();
    await expect(modal).not.toBeVisible();
  };

  // ---------- 3. Add Multiple Choice Question ----------
  let modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(questionMC);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-multiple-choice").click();

  // Fill options
  await modal.getByTestId("mc-option-0-input").fill("Berlin");
  await modal.getByTestId("mc-option-1-input").fill("Madrid");
  await modal.getByTestId("mc-option-2-input").fill(optionCorrect);
  await modal.getByTestId("mc-option-3-input").fill("Lisbon");

  // Mark correct answer (third option, index 2)
  await modal.getByTestId("mc-option-2-checkbox").check();

  await modal
    .getByTestId("question-explanation")
    .fill("Paris is the capital of France.");
  await submitQuestion(modal);

  // Verify question appears
  await expect(
    page.locator(`div:has-text("${questionMC}")`).first(),
  ).toBeVisible();

  // ---------- 4. Add True/False Question ----------
  modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(questionTF);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-true-false").click();

  // Choose correct answer (false)
  await modal.getByTestId("true-false-false").check();

  await modal
    .getByTestId("question-explanation")
    .fill("Paris is the capital, not Berlin.");
  await submitQuestion(modal);

  await expect(
    page.locator(`div:has-text("${questionTF}")`).first(),
  ).toBeVisible();

  // ---------- 5. Add Fill Blank Question ----------
  modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(questionFB);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-fill-blank").click();

  await modal.getByTestId("fill-blank-keyword").fill(fbKeyword);

  await modal.getByTestId("question-explanation").fill("Paris is the capital.");
  await submitQuestion(modal);

  await expect(
    page.locator(`div:has-text("${questionFB}")`).first(),
  ).toBeVisible();

  // ---------- 6. Add Ordering Question ----------
  modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(questionOrder);
  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-ordering").click();

  // Fill the first three ordering items
  for (let i = 0; i < orderItems.length; i++) {
    const input = modal.getByTestId(`ordering-item-${i}`);
    await input.fill(orderItems[i]);
  }
  // Remove the extra fourth item (if present)
  const removeFourth = modal.getByTestId("ordering-remove-3");
  if (await removeFourth.isVisible()) await removeFourth.click();

  await modal.getByTestId("question-explanation").fill("Closest to farthest.");
  await submitQuestion(modal);

  await expect(
    page.locator(`div:has-text("${questionOrder}")`).first(),
  ).toBeVisible();

  // ---------- 7. Add Matching Question ----------
  modal = await openQuestionModal();
  await modal.getByTestId("question-title").fill(questionMatch);

  await page.waitForTimeout(1000);

  await modal.getByTestId("question-type-select").click();
  await page.getByTestId("option-matching").click();

  // Fill first pair
  await modal.getByTestId("matching-left-0").fill(matchPairs[0].left);
  await modal.getByTestId("matching-right-0").fill(matchPairs[0].right);
  // Add second pair
  const addPairBtn = modal.getByTestId("matching-add");
  await addPairBtn.click();
  // Fill second pair (now index 1)
  await modal.getByTestId("matching-left-1").fill(matchPairs[1].left);
  await modal.getByTestId("matching-right-1").fill(matchPairs[1].right);

  await modal
    .getByTestId("question-explanation")
    .fill("Countries and capitals.");
  await submitQuestion(modal);

  await expect(
    page.locator(`div:has-text("${questionMatch}")`).first(),
  ).toBeVisible();

  // ---------- 8. Verify total questions count ----------
  const totalSpan = page.getByTestId("questions-total");
  await expect(totalSpan).toHaveText("Total: 5");

  // ---------- 9. Delete the quiz ----------
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
    `[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`,
  );
  await expect(quizItem).not.toBeVisible();
});
