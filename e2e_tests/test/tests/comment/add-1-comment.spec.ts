

import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

test.describe('Quiz comment and delete flow', () => {
  test('should create empty quiz, add a comment, and delete it', async ({ page }) => {
    // 1. Login as test1/1
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

    // Fill quiz form with unique title
    const uniqueTitle = `Test Quiz ${Date.now()}`;
    await page.getByTestId('quiz-title-input').fill(uniqueTitle);
    await page.getByTestId('quiz-description-input').fill('A test quiz created by Playwright');
    // Keep visibility as public (default) – no need to change
    await page.getByTestId('quiz-submit-button').click();

    // Wait for redirect to quiz detail page and extract quiz ID from URL
    await page.waitForURL(/\/quiz\/\d+$/);
    const url = page.url();
    const quizIdMatch = url.match(/\/quiz\/(\d+)/);
    expect(quizIdMatch).not.toBeNull();
    const quizId = quizIdMatch![1];

    // 3. Navigate to the public view page (where comments are available)
    await page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);
    await expect(page.getByTestId('quiz-title')).toHaveText(uniqueTitle);

    // 4. Add a comment
    await expect(page.getByTestId('new-comment-input')).toBeVisible();

    const commentText = 'This is a test comment from Playwright.';
    await page.getByTestId('new-comment-input').fill(commentText);

    await page.getByTestId('submit-comment-button').click();

    // Wait for the comment to appear and verify it's present
    // Comments are rendered with testid "comment-{id}" – we can check for the text content
    const commentLocator = page.locator('[data-testid^="comment-"]').filter({ hasText: commentText });
    await expect(commentLocator).toBeVisible();

    // 5. Go back to the detail page to delete the quiz
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(page.getByTestId('quiz-title')).toHaveText(uniqueTitle);

    // Click the delete button (opens popconfirm)
    await page.getByTestId('delete-quiz-button').click();
    // Confirm deletion
    await page.getByTestId('confirm-delete-quiz-button').click();

    // After deletion, we should be redirected to the quiz list page
    await expect(page).toHaveURL(`${FRONTEND_URL}/quiz`);
  });
});