
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

test('admin can update an ordering question', async ({ page }) => {
  const originalTitle = getUniqueTitle('Original Ordering');
  const updatedTitle = getUniqueTitle('Updated Ordering');
  const tagOriginal = `order-original-${Date.now()}`;
  const tagUpdated = `order-updated-${Date.now()}`;

  // ---------- 1. Create the original ordering question ----------
  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  await fillCommonFields(page, {
    title: originalTitle,
    description: 'Original description',
    type: 'ordering',
    explanation: 'Original explanation',
    tags: [tagOriginal],
  });

  // Fill initial ordering items (4 default items)
  const item0 = page.getByTestId('ordering-item-0');
  const item1 = page.getByTestId('ordering-item-1');
  const item2 = page.getByTestId('ordering-item-2');
  const item3 = page.getByTestId('ordering-item-3');

  await item0.fill('First step');
  await item1.fill('Second step');
  await item2.fill('Third step');
  await item3.fill('Fourth step');

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

  // Modify ordering items: add, edit, delete
  // Edit the third item (index 2)
  const itemToEdit = page.getByTestId('ordering-item-2');
  await itemToEdit.fill('Edited third step');

  // Add a new item
  const addItemButton = page.getByTestId('ordering-add');
  await addItemButton.click();
  const newItemInput = page.getByTestId('ordering-item-4');
  await newItemInput.fill('New added item');

  // Delete the new item
  const deleteNewItemButton = page.getByTestId('ordering-remove-4');
  await deleteNewItemButton.click();
  await expect(newItemInput).not.toBeVisible();

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

  // Optionally, verify that the items were updated by editing again
  const updatedId = await getQuestionIdFromItem(updatedItem);
  const editAgainButton = page.getByTestId(`edit-question-btn-${updatedId}`);
  await editAgainButton.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/question/${updatedId}/edit`);

  // Check that the ordering items are as expected (the third item is edited)
  const editedItemInput = page.getByTestId('ordering-item-2');
  await expect(editedItemInput).toHaveValue('Edited third step');

  // ---------- 5. Clean up ----------
  // Go back to list and delete the updated question
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