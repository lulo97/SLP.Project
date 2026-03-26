// e2e_tests/test/tests/question/multiple_choice_1_option.spec.ts
import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToCreateQuestion,
  fillCommonFields,
  getUniqueTitle, FRONTEND_URL
} from '../utils';

test('should not allow creating a multiple choice question with only one option', async ({ page }) => {
  const title = getUniqueTitle('Invalid MC Question');
  const optionText = 'Only option';

  await loginAsAdmin(page);
  await navigateToCreateQuestion(page);

  // Fill common fields
  await fillCommonFields(page, {
    title,
    description: 'This question should be rejected because it has only one option.',
    type: 'multiple-choice',
    explanation: 'Test validation',
  });

  // By default there are 4 empty options. Keep only the first one.
  // Remove options at indices 3, 2, 1 (descending to avoid index shifts)
  for (let i = 3; i >= 1; i--) {
    const removeButton = page.getByTestId(`mc-option-${i}-remove`);
    await removeButton.click();
    // Wait a bit for the removal to complete (optional, Playwright auto-waits)
  }

  // Fill the remaining option
  const optionInput = page.getByTestId('mc-option-0-input');
  await optionInput.fill(optionText);

  // Mark it as correct
  const correctCheckbox = page.getByTestId('mc-option-0-checkbox');
  await correctCheckbox.check();

  // Attempt to submit
  const submitButton = page.getByTestId('submit-question');
  await submitButton.click();

  // Wait for the warning message to appear
  const warningMessage = page.locator('.ant-message-warning');
  await expect(warningMessage).toBeVisible({ timeout: 5000 });
  await expect(warningMessage).toContainText('At least two options are required');

  // Ensure we are still on the create page (no redirect)
  await expect(page).toHaveURL(/\/question\/new/);

  // Optional: verify the question was not created by going to the list and searching
  await page.goto(`${FRONTEND_URL}/questions`);
  const searchInput = page.getByTestId('question-search');
  await searchInput.fill(title);
  await searchInput.press('Enter');
  const questionItem = page.locator(`li[data-testid^="question-item-"]:has-text("${title}")`);
  await expect(questionItem).not.toBeVisible();
});