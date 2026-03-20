// e2e_tests/test/tests/question/ordering.spec.ts
import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  submitQuestion,
  getUniqueTitle,
  verifyAndDeleteQuestion,
} from '../utils';

test('create and delete an ordering question as admin', async ({ page }) => {
  const title = getUniqueTitle('Test Ordering Question');
  const description = 'This is a test description for the ordering question.';
  const explanation = `Explanation for ${title}`;
  const tagName = `order-tag-${Date.now()}`;

  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  // Fill common fields
  await fillCommonFields(page, {
    title,
    description,
    type: 'ordering',           // matches data-testid="option-ordering"
    explanation,
    tags: [tagName],
  });

  // Ordering specific interactions
  const itemInput0 = page.getByTestId('ordering-item-0');
  const itemInput1 = page.getByTestId('ordering-item-1');
  const itemInput2 = page.getByTestId('ordering-item-2');
  const itemInput3 = page.getByTestId('ordering-item-3');

  await itemInput0.fill('First step');
  await itemInput1.fill('Second step');
  await itemInput2.fill('Third step');
  await itemInput3.fill('Fourth step');

  // Add a new item
  const addItemButton = page.getByTestId('ordering-add');
  await addItemButton.click();
  const newItemInput = page.getByTestId('ordering-item-4');
  await newItemInput.fill('New item added');

  // Delete the newly added item
  const deleteNewItemButton = page.getByTestId('ordering-remove-4');
  await deleteNewItemButton.click();
  await expect(newItemInput).not.toBeVisible();

  // Edit the third item (index 2)
  const itemToEdit = page.getByTestId('ordering-item-2');
  await itemToEdit.fill('Edited third step');

  await submitQuestion(page);
  await verifyAndDeleteQuestion(page, title);
});