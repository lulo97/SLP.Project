// e2e_tests/test/tests/question/update_matching.spec.ts
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

test('admin can update a matching question', async ({ page }) => {
  const originalTitle = getUniqueTitle('Original Matching');
  const updatedTitle = getUniqueTitle('Updated Matching');
  const tagOriginal = `match-original-${Date.now()}`;
  const tagUpdated = `match-updated-${Date.now()}`;

  // ---------- 1. Create the original matching question ----------
  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  await fillCommonFields(page, {
    title: originalTitle,
    description: 'Original description',
    type: 'matching',
    explanation: 'Original explanation',
    tags: [tagOriginal],
  });

  // Fill initial matching pairs (4 default empty pairs)
  const left0 = page.getByTestId('matching-left-0');
  const right0 = page.getByTestId('matching-right-0');
  await left0.fill('Apple');
  await right0.fill('Fruit');

  const left1 = page.getByTestId('matching-left-1');
  const right1 = page.getByTestId('matching-right-1');
  await left1.fill('Carrot');
  await right1.fill('Vegetable');

  const left2 = page.getByTestId('matching-left-2');
  const right2 = page.getByTestId('matching-right-2');
  await left2.fill('Milk');
  await right2.fill('Dairy');

  // Keep the fourth pair empty as a test for later removal

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

  // Modify matching pairs: add, edit, delete
  // Edit an existing pair (index 2)
  const leftToEdit = page.getByTestId('matching-left-2');
  const rightToEdit = page.getByTestId('matching-right-2');
  await leftToEdit.fill('Yogurt');
  await rightToEdit.fill('Fermented dairy');

  // Add a new pair
  const addPairButton = page.getByTestId('matching-add');
  await addPairButton.click();

  // After adding, the new pair will be at index 3 (since we started with 4 pairs)
  const newLeft = page.getByTestId('matching-left-3');
  const newRight = page.getByTestId('matching-right-3');
  await newLeft.fill('Bread');
  await newRight.fill('Bakery');

  // Delete the newly added pair
  const removeNewButton = page.getByTestId('matching-remove-3');
  await removeNewButton.click();

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

  // Optionally, verify that the pairs were updated by editing again
  const updatedId = await getQuestionIdFromItem(updatedItem);
  const editAgainButton = page.getByTestId(`edit-question-btn-${updatedId}`);
  await editAgainButton.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/question/${updatedId}/edit`);

  // Check that the edited pair (index 2) has the new values
  const editedLeft = page.getByTestId('matching-left-2');
  const editedRight = page.getByTestId('matching-right-2');
  await expect(editedLeft).toHaveValue('Yogurt');
  await expect(editedRight).toHaveValue('Fermented dairy');

  // Check that the fourth pair (original empty) was removed; the third pair (index 2) is now the last
  const fourthPairExists = page.getByTestId('matching-left-3');
  await expect(fourthPairExists).not.toBeVisible();

  // ---------- 5. Clean up ----------
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