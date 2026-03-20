// e2e_tests/test/tests/question/update_question.spec.ts
import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  submitQuestion,
  getUniqueTitle,
  verifyAndDeleteQuestion,
  getQuestionIdFromItem,
} from "../utils";

test("admin can update a multiple choice question", async ({ page }) => {
  const originalTitle = getUniqueTitle("Original MC");
  const updatedTitle = getUniqueTitle("Updated MC");
  const tagOriginal = `mc-original-${Date.now()}`;
  const tagUpdated = `mc-updated-${Date.now()}`;

  // Create the question
  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);
  await fillCommonFields(page, {
    title: originalTitle,
    description: "Original description",
    type: "multiple-choice",
    explanation: "Original explanation",
    tags: [tagOriginal],
  });
  // Fill MC options
  await page.getByTestId("mc-option-0-input").fill("Apple");
  await page.getByTestId("mc-option-1-input").fill("Banana");
  await page.getByTestId("mc-option-2-input").fill("Cherry");
  await page.getByTestId("mc-option-0-checkbox").check(); // correct: Apple
  await submitQuestion(page);

  // Find the question in the list and edit it
  await page.goto("http://localhost:4000/questions");
  const searchInput = page.getByTestId("question-search");
  await searchInput.fill(originalTitle);
  await searchInput.press("Enter");
  const item = page
    .locator(`li[data-testid^="question-item-"]:has-text("${originalTitle}")`)
    .first();
  await expect(item).toBeVisible();

  const questionId = await getQuestionIdFromItem(item);
  const editButton = page.getByTestId(`edit-question-btn-${questionId}`);
  await editButton.click();
  await expect(page).toHaveURL(
    `http://localhost:4000/question/${questionId}/edit`,
  );

  // Update fields
  const titleInput = page.getByTestId("question-title");
  await titleInput.fill(updatedTitle);
  const descriptionInput = page.getByTestId("question-description");
  await descriptionInput.fill("Updated description");
  const explanationInput = page.getByTestId("question-explanation");
  await explanationInput.fill("Updated explanation");

  // Update tags: remove original, add new
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  // Remove original tag (click the X on the tag)
  const originalTagBadge = page.locator(
    `.ant-select-selection-item:has-text("${tagOriginal}")`,
  );
  await originalTagBadge.locator(".ant-select-selection-item-remove").click();
  // Add new tag
  await tagInput.fill(tagUpdated);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  // Update MC options: change correct answer to Banana
  await page.getByTestId("mc-option-0-checkbox").uncheck(); // uncheck Apple
  await page.getByTestId("mc-option-1-checkbox").check(); // check Banana

  // Add and remove an option to test dynamic behavior
  await page.getByTestId("mc-add-option").click();
  await page.waitForTimeout(500); // give Vue time to update (temporary)
  const allInputs = await page.getByTestId(/^mc-option-\d+-input$/).all();
  console.log(
    await Promise.all(allInputs.map((el) => el.getAttribute("data-testid"))),
  );

  const newOptionInput = page.getByTestId("mc-option-3-input");
  await newOptionInput.fill("Elderberry");
  await page.getByTestId("mc-option-3-remove").click();

  await submitQuestion(page);

  // Verify the updated question appears in list
  await page.goto("http://localhost:4000/questions");
  await searchInput.fill(updatedTitle);
  await searchInput.press("Enter");
  const updatedItem = page
    .locator(`li[data-testid^="question-item-"]:has-text("${updatedTitle}")`)
    .first();
  await expect(updatedItem).toBeVisible();

  // Clean up
  await verifyAndDeleteQuestion(page, updatedTitle);
});
