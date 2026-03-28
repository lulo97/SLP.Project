
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

test('admin can update a fill in the blank question', async ({ page }) => {
  const originalTitle = getUniqueTitle('Original Fill Blank');
  const updatedTitle = getUniqueTitle('Updated Fill Blank');
  const originalKeyword = `Original`; // single word
  const updatedKeyword = `Updated`;  // single word
  const tagOriginal = `fb-original-${Date.now()}`;
  const tagUpdated = `fb-updated-${Date.now()}`;

  // ---------- 1. Create the question ----------
  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  await fillCommonFields(page, {
    title: originalTitle,
    description: 'Original description',
    type: 'fill-blank',
    explanation: 'Original explanation',
    tags: [tagOriginal],
  });

  // Fill blank specific: keyword
  const keywordInput = page.getByTestId('fill-blank-keyword');
  await keywordInput.fill(originalKeyword);

  await submitQuestion(page);

  // ---------- 2. Locate the created question and go to edit ----------
  await page.goto(`${FRONTEND_URL}/questions`);
  const searchInput = page.getByTestId('question-search');
  await searchInput.fill(originalTitle);
  await searchInput.press('Enter');

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

  // Change keyword
  await keywordInput.fill(updatedKeyword);

  await submitQuestion(page);

  // ---------- 4. Verify the updated question appears in the list ----------
  await page.goto(`${FRONTEND_URL}/questions`);
  await searchInput.fill(updatedTitle);
  await searchInput.press('Enter');

  const updatedItem = page
    .locator(`[data-testid^="question-item-"]:has-text("${updatedTitle}")`)
    .first();
  await expect(updatedItem).toBeVisible();

  // Optionally, verify that the keyword was updated by editing again
  const updatedId = await getQuestionIdFromItem(updatedItem);
  const editAgainButton = page.getByTestId(`edit-question-btn-${updatedId}`);
  await editAgainButton.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/question/${updatedId}/edit`);

  // Check that the keyword input contains the updated keyword
  const keywordInputAgain = page.getByTestId('fill-blank-keyword');
  await expect(keywordInputAgain).toHaveValue(updatedKeyword);

  // ---------- 5. Clean up ----------
  await page.goto(`${FRONTEND_URL}/questions`);
  await searchInput.fill(updatedTitle);
  await searchInput.press('Enter');

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