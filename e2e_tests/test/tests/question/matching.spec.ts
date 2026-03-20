// e2e_tests/test/tests/question/matching.spec.ts
import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  submitQuestion,
  getUniqueTitle,
  verifyAndDeleteQuestion,
} from './utils';

test('create and delete a matching question as admin', async ({ page }) => {
  const title = getUniqueTitle('Test Matching Question');
  const description = 'This is a test description for the matching question.';
  const explanation = `Explanation for ${title}`;
  const tagName = `match-tag-${Date.now()}`;

  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  // Fill common fields
  await fillCommonFields(page, {
    title,
    description,
    type: 'matching',           // matches data-testid="option-matching"
    explanation,
    tags: [tagName],
  });

  // Matching specific interactions
  // Fill first two pairs (initial 4 empty pairs)
  const left0 = page.getByTestId('matching-left-0');
  const right0 = page.getByTestId('matching-right-0');
  await left0.fill('Apple');
  await right0.fill('Fruit');

  const left1 = page.getByTestId('matching-left-1');
  const right1 = page.getByTestId('matching-right-1');
  await left1.fill('Carrot');
  await right1.fill('Vegetable');

  // Add a new pair
  const addPairButton = page.getByTestId('matching-add');
  await addPairButton.click();

  // Fill the new pair (index 4, because we started with 4 pairs and added one)
  const leftNew = page.getByTestId('matching-left-4');
  const rightNew = page.getByTestId('matching-right-4');
  await leftNew.fill('Milk');
  await rightNew.fill('Dairy');

  // Delete the newly added pair
  const removeNew = page.getByTestId('matching-remove-4');
  await removeNew.click();

  // Edit an existing pair (index 2)
  const left2 = page.getByTestId('matching-left-2');
  const right2 = page.getByTestId('matching-right-2');
  await left2.fill('Dog');
  await right2.fill('Animal');

  await submitQuestion(page);
  await verifyAndDeleteQuestion(page, title);
});