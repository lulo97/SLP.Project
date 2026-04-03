

import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3009';

test.describe('Quiz comment parent deletion flow', () => {
  test('test1 creates quiz, test2 comments, test1 replies, test2 deletes parent comment, test1 deletes quiz', async ({ browser }) => {
    // ---------- Step 1: test1 creates a quiz and logs out ----------
    const test1Context = await browser.newContext();
    const test1Page = await test1Context.newPage();

    await test1Page.goto(`${FRONTEND_URL}/login`);
    await test1Page.fill('input[placeholder="Enter your username"]', 'test1');
    await test1Page.fill('input[placeholder="Enter your password"]', '1');
    await test1Page.click('button[type="submit"]');
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await test1Page.goto(`${FRONTEND_URL}/quiz`);
    await test1Page.click('[data-testid="create-quiz-fab"]');

    const uniqueTitle = `Test Quiz ${Date.now()}`;
    await test1Page.fill('[data-testid="quiz-title-input"]', uniqueTitle);
    await test1Page.fill('[data-testid="quiz-description-input"]', 'A test quiz created by test1');
    await test1Page.click('[data-testid="quiz-submit-button"]');

    await test1Page.waitForURL(/\/quiz\/\d+$/);
    const url = test1Page.url();
    const quizId = url.match(/\/quiz\/(\d+)/)?.[1];
    expect(quizId).toBeDefined();

    // Logout test1
    await test1Page.getByTestId('sidebar-toggle-button').click();
    await expect(test1Page.getByTestId('sidebar-container')).toBeVisible();
    await test1Page.getByTestId('nav-item-logout').click();
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/login`);

    // ---------- Step 2: test2 logs in, adds a comment ----------
    const test2Context = await browser.newContext();
    const test2Page = await test2Context.newPage();

    await test2Page.goto(`${FRONTEND_URL}/login`);
    await test2Page.fill('input[placeholder="Enter your username"]', 'test2');
    await test2Page.fill('input[placeholder="Enter your password"]', '2');
    await test2Page.click('button[type="submit"]');
    await expect(test2Page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await test2Page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);

    const commentText = `Comment from test2 at ${Date.now()}`;
    await test2Page.fill('[data-testid="new-comment-input"]', commentText);
    await test2Page.click('[data-testid="submit-comment-button"]');

    // Capture the parent comment ID
    const commentLocator = test2Page
      .locator(`[data-testid^="comment-"]`)
      .filter({ hasText: commentText });
    await expect(commentLocator).toBeVisible();
    const commentIdAttr = await commentLocator.getAttribute('data-testid');
    const parentCommentId = commentIdAttr?.split('-')[1];
    expect(parentCommentId).toBeDefined();

    // Logout test2
    await test2Page.getByTestId('sidebar-toggle-button').click();
    await expect(test2Page.getByTestId('sidebar-container')).toBeVisible();
    await test2Page.getByTestId('nav-item-logout').click();
    await expect(test2Page).toHaveURL(`${FRONTEND_URL}/login`);

    // ---------- Step 3: test1 logs in and replies ----------
    await test1Page.goto(`${FRONTEND_URL}/login`);
    await test1Page.fill('input[placeholder="Enter your username"]', 'test1');
    await test1Page.fill('input[placeholder="Enter your password"]', '1');
    await test1Page.click('button[type="submit"]');
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await test1Page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);

    // Locate the parent comment and click reply
    const parentComment = test1Page.locator(`[data-testid="comment-${parentCommentId}"]`);
    await parentComment.scrollIntoViewIfNeeded();
    await parentComment.locator('[data-testid="reply-button"]').click();

    const replyInput = test1Page.locator('[data-testid="reply-input"]');
    await expect(replyInput).toBeVisible();
    const replyText = `Reply from test1 at ${Date.now()}`;
    await replyInput.fill(replyText);
    await test1Page.click('[data-testid="reply-modal-ok"]');

    // Verify the reply appears under the parent comment
    const replyLocator = parentComment
      .locator('[data-testid^="comment-"]')
      .filter({ hasText: replyText });
    await expect(replyLocator).toBeVisible();

    // Logout test1
    await test1Page.getByTestId('sidebar-toggle-button').click();
    await expect(test1Page.getByTestId('sidebar-container')).toBeVisible();
    await test1Page.getByTestId('nav-item-logout').click();
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/login`);

    // ---------- Step 4: test2 logs in and deletes the parent comment ----------
    await test2Page.goto(`${FRONTEND_URL}/login`);
    await test2Page.fill('input[placeholder="Enter your username"]', 'test2');
    await test2Page.fill('input[placeholder="Enter your password"]', '2');
    await test2Page.click('button[type="submit"]');
    await expect(test2Page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await test2Page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);

    // Locate the parent comment again (should still be visible)
    const parentCommentAgain = test2Page.locator(`[data-testid="comment-${parentCommentId}"]`);
    await expect(parentCommentAgain).toBeVisible();

    // Click delete button and confirm
    await parentCommentAgain.locator('[data-testid="delete-button"]').click();
    await test2Page.locator('[data-testid="confirm-delete-comment-button"]').click();

    // Verify parent comment is gone
    await expect(parentCommentAgain).not.toBeVisible();

    // Logout test2
    await test2Page.getByTestId('sidebar-toggle-button').click();
    await expect(test2Page.getByTestId('sidebar-container')).toBeVisible();
    await test2Page.getByTestId('nav-item-logout').click();
    await expect(test2Page).toHaveURL(`${FRONTEND_URL}/login`);

    // ---------- Step 5: test1 logs in and deletes the quiz ----------
    await test1Page.goto(`${FRONTEND_URL}/login`);
    await test1Page.fill('input[placeholder="Enter your username"]', 'test1');
    await test1Page.fill('input[placeholder="Enter your password"]', '1');
    await test1Page.click('button[type="submit"]');
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await test1Page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await test1Page.click('[data-testid="delete-quiz-button"]');
    await test1Page.click('[data-testid="confirm-delete-quiz-button"]');
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/quiz`);

    // Cleanup
    await test1Context.close();
    await test2Context.close();
  });
});