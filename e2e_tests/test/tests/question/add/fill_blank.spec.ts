
import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  submitQuestion,
  getUniqueTitle,
  verifyAndDeleteQuestion,
} from '../utils';

test('create and delete a fill in the blank question as admin', async ({ page }) => {
  const title = getUniqueTitle('Test Fill Blank Question');
  const description = 'This is a test description for the fill in the blank question.';
  const explanation = `Explanation for ${title}`;
  const tagName = `fb-tag-${Date.now()}`;
  const keyword = `${Date.now()}`; // single word, no spaces

  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  // Fill common fields
  await fillCommonFields(page, {
    title,
    description,
    type: 'fill-blank',         // matches data-testid="option-fill-blank"
    explanation,
    tags: [tagName],
  });

  // Fill‑blank specific: keyword
  const keywordInput = page.getByTestId('fill-blank-keyword');
  await keywordInput.fill(keyword);

  await submitQuestion(page);
  await verifyAndDeleteQuestion(page, title);
});