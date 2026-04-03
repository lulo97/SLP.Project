

import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3009';

test.describe('Quiz – comment add & delete flow', () => {
  test('test1 creates quiz, adds comment, deletes comment, deletes quiz', async ({ page }) => {
    // 1. Login as test1 / 1
    await page.goto(`${FRONTEND_URL}/login`);
    await page.getByPlaceholder('Enter your username').fill('test1');
    await page.getByPlaceholder('Enter your password').fill('1');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // 2. Go to quiz list and create a new quiz
    await page.goto(`${FRONTEND_URL}/quiz`);
    await expect(page.getByTestId('tab-my-quizzes')).toBeVisible();

    // Click the floating action button to create a new quiz
    await page.getByTestId('create-quiz-fab').click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/quiz/new`);

    const uniqueTitle = `Test Quiz ${Date.now()}`;
    await page.getByTestId('quiz-title-input').fill(uniqueTitle);
    await page.getByTestId('quiz-description-input').fill('A test quiz created by test1');
    // Keep visibility as public (default)
    await page.getByTestId('quiz-submit-button').click();

    // Wait for redirect to quiz detail page and capture quiz ID from URL
    await page.waitForURL(/\/quiz\/\d+$/);
    const url = page.url();
    const quizIdMatch = url.match(/\/quiz\/(\d+)/);
    expect(quizIdMatch).not.toBeNull();
    const quizId = quizIdMatch![1];

    // 3. Navigate to the public view page (where comments are available)
    await page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);
    await expect(page.getByTestId('quiz-title')).toHaveText(uniqueTitle);

    // 4. Add a comment
    const commentText = `This is a test comment from test1 at ${Date.now()}`;
    await page.getByTestId('new-comment-input').fill(commentText);
    await page.getByTestId('submit-comment-button').click();

    // Wait for the comment to appear and capture its element
    const commentLocator = page.locator('[data-testid^="comment-"]').filter({ hasText: commentText });
    await expect(commentLocator).toBeVisible();
    const commentIdAttr = await commentLocator.getAttribute('data-testid');
    const numericCommentId = commentIdAttr?.split('-')[1];
    expect(numericCommentId).toBeDefined();

    // 5. Delete the comment (using the delete button inside the comment)
    // The delete button is inside a popconfirm – first click the delete button,
    // then confirm in the popconfirm.
    const deleteButton = commentLocator.locator('[data-testid="delete-button"]');
    await deleteButton.click();

    // Confirm deletion in the popconfirm (the confirm button has data-testid="confirm-delete-comment-button")
    const confirmDeleteButton = page.getByTestId('confirm-delete-comment-button');
    await confirmDeleteButton.click();

    // Verify the comment is no longer visible
    await expect(commentLocator).not.toBeVisible();

    // 6. Go back to the detail page (owner view) to delete the quiz
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(page.getByTestId('quiz-title')).toHaveText(uniqueTitle);

    // Click the delete button (opens popconfirm)
    await page.getByTestId('delete-quiz-button').click();
    // Confirm deletion
    await page.getByTestId('confirm-delete-quiz-button').click();

    // After deletion, we should be redirected to the quiz list page
    await expect(page).toHaveURL(`${FRONTEND_URL}/quiz`);

    // Optional: verify the quiz is gone from the list (by searching for its title)
    // This step may be omitted for brevity, but it's a good safety check.
    // Since we have a unique title, we can quickly check the first page.
    // If the quiz list is paginated, we might need to search, but for simplicity we'll assume
    // the newly created quiz appears on the first page.
    await expect(page.getByTestId('quiz-list-item-' + quizId)).not.toBeVisible();
  });
});