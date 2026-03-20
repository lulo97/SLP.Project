// e2e_tests/test/tests/question/multiple_choice_no_correct.spec.ts
import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  getUniqueTitle,
} from './utils';

test('should not allow creating a multiple choice question with no correct answer', async ({ page }) => {
  const title = getUniqueTitle('MC No Correct Answer');
  const optionTexts = ['Option A', 'Option B', 'Option C'];

  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  // Fill common fields
  await fillCommonFields(page, {
    title,
    description: 'This question has options but no correct answer selected.',
    type: 'multiple-choice',
    explanation: 'Should be rejected by validation.',
  });

  // By default there are 4 empty options. We'll keep the first three and delete the fourth.
  // Remove option at index 3 (the fourth input)
  const removeButton3 = page.getByTestId('mc-option-3-remove');
  await removeButton3.click();

  // Fill the three remaining options
  for (let i = 0; i < optionTexts.length; i++) {
    const input = page.getByTestId(`mc-option-${i}-input`);
    await input.fill(optionTexts[i]);
  }

  // DO NOT check any correct answer checkbox

  // Attempt to submit
  const submitButton = page.getByTestId('submit-question');
  await submitButton.click();

  // Wait for the warning message to appear
  const warningMessage = page.locator('.ant-message-warning');
  await expect(warningMessage).toBeVisible({ timeout: 5000 });
  await expect(warningMessage).toContainText('Please select at least one correct answer');

  // Ensure we are still on the create page (no redirect)
  await expect(page).toHaveURL(/\/question\/new/);

  // Verify the question was not created by going to the list and searching
  await page.goto('http://localhost:4000/questions');
  const searchInput = page.getByTestId('question-search');
  await searchInput.fill(title);
  await searchInput.press('Enter');
  const questionItem = page.locator(`li[data-testid^="question-item-"]:has-text("${title}")`);
  await expect(questionItem).not.toBeVisible();
});