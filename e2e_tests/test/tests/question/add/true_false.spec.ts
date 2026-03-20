// e2e_tests/test/tests/question/true_false.spec.ts
import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  submitQuestion,
  getUniqueTitle,
  verifyAndDeleteQuestion,
} from '../utils';

test('create and delete a true/false question as admin', async ({ page }) => {
  const title = getUniqueTitle('Test TF Question');
  const description = 'This is a test description for the true/false question.';
  const explanation = `Explanation for ${title}`;
  const tagName = `tf-tag-${Date.now()}`;

  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  // Fill common fields
  await fillCommonFields(page, {
    title,
    description,
    type: 'true-false',         // matches data-testid="option-true-false"
    explanation,
    tags: [tagName],
  });

  // True/False specific: choose "True"
  const trueRadio = page.getByTestId('true-false-true');
  await trueRadio.check();

  await submitQuestion(page);
  await verifyAndDeleteQuestion(page, title);
});