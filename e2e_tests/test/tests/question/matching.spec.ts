// e2e_tests/test/tests/question/matching.spec.ts
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:4000';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '123';

test('create and delete a matching question as admin', async ({ page }) => {
  // Generate unique question title
  const timestamp = Date.now();
  const questionTitle = `Test Matching Question ${timestamp}`;
  const explanationText = `Explanation for ${timestamp}`;
  const tagName = `match-tag-${timestamp}`;

  // Step 1: Log in as admin
  await test.step('Login as admin', async () => {
    await page.goto(FRONTEND_URL);

    const usernameInput = page.getByPlaceholder('Enter your username');
    const passwordInput = page.getByPlaceholder('Enter your password');
    const signInButton = page.getByRole('button', { name: 'Sign In' });

    await usernameInput.fill(ADMIN_USERNAME);
    await passwordInput.fill(ADMIN_PASSWORD);
    await signInButton.click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  // Step 2: Navigate to question list and click create button
  await test.step('Go to question list and open create form', async () => {
    await page.goto(`${FRONTEND_URL}/questions`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/questions`);

    const createButton = page.getByTestId('create-question');
    await createButton.click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/question/new`);
  });

  // Step 3: Fill the matching form
  await test.step('Fill matching question details', async () => {
    // Question title
    const titleInput = page.getByTestId('question-title');
    await titleInput.fill(questionTitle);

    // Description (optional)
    const descriptionInput = page.getByTestId('question-description');
    await descriptionInput.fill('This is a test description for the matching question.');

    // Select matching type
    const typeSelect = page.getByTestId('question-type-select');
    await typeSelect.click();
    await page.getByTestId('option-matching').click();

    // Initially there are 4 empty pairs (left/right)
    // Fill first two pairs with meaningful values
    const left0 = page.getByTestId('matching-left-0');
    const right0 = page.getByTestId('matching-right-0');
    await left0.fill('Apple');
    await right0.fill('Fruit');

    const left1 = page.getByTestId('matching-left-1');
    const right1 = page.getByTestId('matching-right-1');
    await left1.fill('Carrot');
    await right1.fill('Vegetable');

    // Add a new pair (button with testid matching-add)
    const addPairButton = page.getByTestId('matching-add');
    await addPairButton.click();

    // Fill the new pair (index 4, because we started with 4 pairs and added one)
    const leftNew = page.getByTestId('matching-left-4');
    const rightNew = page.getByTestId('matching-right-4');
    await leftNew.fill('Milk');
    await rightNew.fill('Dairy');

    // Delete the newly added pair (remove button for index 4)
    const removeNew = page.getByTestId('matching-remove-4');
    await removeNew.click();

    // Now edit an existing pair (index 2) – change left and right
    const left2 = page.getByTestId('matching-left-2');
    const right2 = page.getByTestId('matching-right-2');
    await left2.fill('Dog');
    await right2.fill('Animal');

    // Explanation
    const explanationInput = page.getByTestId('question-explanation');
    await explanationInput.fill(explanationText);

    // Add a tag with timestamp
    const tagSelector = page.getByTestId('tag-selector');
    await tagSelector.click();
    const tagInput = tagSelector.locator('input');
    await tagInput.fill(tagName);
    await tagInput.press('Enter');
    await tagInput.press('Escape');
  });

  // Step 4: Submit the form
  await test.step('Submit the question', async () => {
    const submitButton = page.getByTestId('submit-question');
    await submitButton.click();

    // After successful creation, we should be redirected to the question list
    await expect(page).toHaveURL(`${FRONTEND_URL}/questions`);
  });

  // Step 5: Verify the question appears in the list and delete it
  await test.step('Verify new question appears in list and delete it', async () => {
    // Use search to filter by title
    const searchInput = page.getByTestId('question-search');
    await searchInput.fill(questionTitle);
    await searchInput.press('Enter');

    // Wait for the list item to appear
    const item = page
      .locator(`li[data-testid^="question-item-"]:has-text("${questionTitle}")`)
      .first();
    await expect(item).toBeVisible();

    // Extract question ID from the item's data-testid
    const itemTestId = await item.getAttribute('data-testid');
    const questionId = itemTestId?.replace('question-item-', '');
    if (!questionId) throw new Error('Could not extract question ID');

    // Click the delete button using the dynamic test ID
    const deleteButton = page.getByTestId(`delete-question-btn-${questionId}`);
    await deleteButton.click();

    // Confirm deletion in the popconfirm
    const confirmButton = page.getByRole('button', { name: 'Yes' });
    await confirmButton.click();

    // Wait for the item to disappear
    await expect(item).not.toBeVisible();
  });
});