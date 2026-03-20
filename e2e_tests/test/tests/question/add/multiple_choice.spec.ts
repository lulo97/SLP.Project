import { test } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  submitQuestion,
  getUniqueTitle,
  verifyAndDeleteQuestion,
} from '../utils';

test('create and delete a multiple choice question as admin', async ({ page }) => {
  const title = getUniqueTitle('Test MC Question');
  const description = 'This is a test description for the multiple choice question.';
  const explanation = `Explanation for ${title}`;
  const tagName = `fruit-${Date.now()}`;

  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  // Fill common fields
  await fillCommonFields(page, {
    title,
    description,
    type: 'multiple-choice',
    explanation,
    tags: [tagName],
  });

  // Multiple‑choice specific steps (still in test)
  const optionInput0 = page.getByTestId('mc-option-0-input');
  const optionInput1 = page.getByTestId('mc-option-1-input');
  const optionInput2 = page.getByTestId('mc-option-2-input');
  const optionInput3 = page.getByTestId('mc-option-3-input');

  await optionInput0.fill('Apple');
  await optionInput1.fill('Banana');
  await optionInput2.fill('Cherry');
  await optionInput3.fill('Date');

  const correctCheckbox0 = page.getByTestId('mc-option-0-checkbox');
  await correctCheckbox0.check();

  // Add and remove an extra option
  const addOptionButton = page.getByTestId('mc-add-option');
  await addOptionButton.click();
  const optionInput4 = page.getByTestId('mc-option-4-input');
  await optionInput4.fill('Elderberry');
  const removeButton4 = page.getByTestId('mc-option-4-remove');
  await removeButton4.click();

  // Edit an existing option
  await optionInput3.fill('Dragonfruit');

  await submitQuestion(page);
  await verifyAndDeleteQuestion(page, title);
});