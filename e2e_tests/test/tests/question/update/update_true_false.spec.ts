
import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  submitQuestion,
  getUniqueTitle,
  getQuestionIdFromItem,
  FRONTEND_URL,
} from '../utils';

test('admin can update a true/false question', async ({ page }) => {
  const originalTitle = getUniqueTitle('Original TF');
  const updatedTitle = getUniqueTitle('Updated TF');
  const tagOriginal = `tf-original-${Date.now()}`;
  const tagUpdated = `tf-updated-${Date.now()}`;

  // ---------- 1. Create the question ----------
  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  await fillCommonFields(page, {
    title: originalTitle,
    description: 'Original description',
    type: 'true-false',
    explanation: 'Original explanation',
    tags: [tagOriginal],
  });

  // True/False specific: choose "True"
  const trueRadio = page.getByTestId('true-false-true');
  await trueRadio.check();

  await submitQuestion(page);

  // ---------- 2. Locate the created question and go to edit ----------
  await page.goto(`${FRONTEND_URL}/questions`);
  const searchInput = page.getByTestId('question-search');
  await searchInput.fill(originalTitle);
  await searchInput.press('Enter');

  // UPDATED: Removed 'li' prefix
  const item = page
    .locator(`[data-testid^="question-item-"]:has-text("${originalTitle}")`)
    .first();
  await expect(item).toBeVisible();

  const questionId = await getQuestionIdFromItem(item);
  const editButton = page.getByTestId(`edit-question-btn-${questionId}`);
  await editButton.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/question/${questionId}/edit`);

  // ---------- 3. Update the question ----------
  const titleInput = page.getByTestId('question-title');
  await titleInput.fill(updatedTitle);

  const descriptionInput = page.getByTestId('question-description');
  await descriptionInput.fill('Updated description');

  const explanationInput = page.getByTestId('question-explanation');
  await explanationInput.fill('Updated explanation');

  // Update tags: remove original, add new
  const tagSelector = page.getByTestId('tag-selector');
  await tagSelector.click();
  const tagInput = tagSelector.locator('input');

  // Remove original tag
  const originalTagBadge = page.locator(
    `.ant-select-selection-item:has-text("${tagOriginal}")`,
  );
  await originalTagBadge.locator('.ant-select-selection-item-remove').click();

  // Add new tag
  await tagInput.fill(tagUpdated);
  await tagInput.press('Enter');
  await tagInput.press('Escape');

  // Change answer from True to False
  const falseRadio = page.getByTestId('true-false-false');
  await falseRadio.check();

  await submitQuestion(page);

  // ---------- 4. Verify the updated question appears in the list ----------
  await page.goto(`${FRONTEND_URL}/questions`);
  await searchInput.fill(updatedTitle);
  await searchInput.press('Enter');

  // UPDATED: Removed 'li' prefix
  const updatedItem = page
    .locator(`[data-testid^="question-item-"]:has-text("${updatedTitle}")`)
    .first();
  await expect(updatedItem).toBeVisible();

  // Optionally, verify that the answer was changed by editing again
  const updatedId = await getQuestionIdFromItem(updatedItem);
  const editAgainButton = page.getByTestId(`edit-question-btn-${updatedId}`);
  await editAgainButton.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/question/${updatedId}/edit`);

  // Check that the false radio is selected
  const falseRadioAgain = page.getByTestId('true-false-false');
  await expect(falseRadioAgain).toBeChecked();

  // ---------- 5. Clean up ----------
  // Go back to list and delete
  await page.goto(`${FRONTEND_URL}/questions`);
  await searchInput.fill(updatedTitle);
  await searchInput.press('Enter');

  // UPDATED: Removed 'li' prefix
  const deleteItem = page
    .locator(`[data-testid^="question-item-"]:has-text("${updatedTitle}")`)
    .first();
  const deleteId = await getQuestionIdFromItem(deleteItem);
  const deleteButton = page.getByTestId(`delete-question-btn-${deleteId}`);
  await deleteButton.click();

  const confirmButton = page.getByRole('button', { name: 'Yes' });
  await confirmButton.click();

  await expect(deleteItem).not.toBeVisible();
});