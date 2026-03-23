// e2e_tests/test/tests/comment/comment-history-and-delete.spec.ts

import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

test.describe('Quiz comment history and deletion flow', () => {
  test('test1 creates quiz, test2 adds and edits comment twice, test1 views history, test1 deletes quiz', async ({ browser }) => {
    // ---------- Step 1: test1 creates a new quiz and logs out ----------
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

    // Wait for redirect to quiz detail page and capture quiz ID
    await test1Page.waitForURL(/\/quiz\/\d+$/);
    const url = test1Page.url();
    const quizIdMatch = url.match(/\/quiz\/(\d+)/);
    expect(quizIdMatch).not.toBeNull();
    const quizId = quizIdMatch![1];

    // Logout test1
    await test1Page.getByTestId('sidebar-toggle-button').click();
    await expect(test1Page.getByTestId('sidebar-container')).toBeVisible();
    await test1Page.getByTestId('nav-item-logout').click();
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/login`);

    // ---------- Step 2: test2 logs in, adds a comment, and edits it twice ----------
    const test2Context = await browser.newContext();
    const test2Page = await test2Context.newPage();

    await test2Page.goto(`${FRONTEND_URL}/login`);
    await test2Page.fill('input[placeholder="Enter your username"]', 'test2');
    await test2Page.fill('input[placeholder="Enter your password"]', '2');
    await test2Page.click('button[type="submit"]');
    await expect(test2Page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Go to the public view of the quiz
    await test2Page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);
    await expect(test2Page.getByTestId('quiz-title')).toHaveText(uniqueTitle);

    // Add a comment
    const originalComment = `Initial comment from test2 at ${Date.now()}`;
    await test2Page.fill('[data-testid="new-comment-input"]', originalComment);
    await test2Page.click('[data-testid="submit-comment-button"]');

    // Wait for the comment to appear and capture its ID
    const commentLocator = test2Page
      .locator('[data-testid^="comment-"]')
      .filter({ hasText: originalComment });
    await expect(commentLocator).toBeVisible();
    const commentIdAttr = await commentLocator.getAttribute('data-testid');
    const numericCommentId = commentIdAttr?.split('-')[1];
    expect(numericCommentId).toBeDefined();

    // Edit the comment twice
    const edit1 = `First edit: ${originalComment}`;
    const edit2 = `Second edit: ${originalComment}`;

    // Edit 1
    await commentLocator.locator('[data-testid="edit-button"]').click();
    const editInput = commentLocator.getByTestId('edit-comment-input');
    await expect(editInput).toBeVisible();
    await editInput.fill(edit1);
    await commentLocator.getByTestId('save-edit-button').click();
    await expect(commentLocator).toContainText(edit1);

    // Edit 2
    await commentLocator.locator('[data-testid="edit-button"]').click();
    await editInput.fill(edit2);
    await commentLocator.getByTestId('save-edit-button').click();
    await expect(commentLocator).toContainText(edit2);

    // Verify the "edited" indicator appears
    await expect(commentLocator.locator('[data-testid="comment-edited-indicator"]')).toBeVisible();

    // Logout test2
    await test2Page.getByTestId('sidebar-toggle-button').click();
    await expect(test2Page.getByTestId('sidebar-container')).toBeVisible();
    await test2Page.getByTestId('nav-item-logout').click();
    await expect(test2Page).toHaveURL(`${FRONTEND_URL}/login`);

    // ---------- Step 3: test1 logs in, views comment history, then deletes the quiz ----------
    // test1 logs in again
    await test1Page.goto(`${FRONTEND_URL}/login`);
    await test1Page.fill('input[placeholder="Enter your username"]', 'test1');
    await test1Page.fill('input[placeholder="Enter your password"]', '1');
    await test1Page.click('button[type="submit"]');
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Go to the owner detail page (not the public view)
    await test1Page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(test1Page.getByTestId('quiz-title')).toHaveText(uniqueTitle);

    // Locate the comment (by its data-testid) and open the history modal
    const comment = test1Page.locator(`[data-testid="comment-${numericCommentId}"]`);
    await expect(comment).toBeVisible();

    // Click the history button
    await comment.locator('[data-testid="history-button"]').click();

    // Wait for the modal to appear and verify its content
    const modal = test1Page.getByTestId('comment-history-modal');
    await expect(modal).toBeVisible();

    // Expect at least three history entries: original + two edits
    const historyEntries = modal.locator('[data-testid^="history-entry-"]');
    await expect(historyEntries).toHaveCount(3);

    // Optional: verify the text of each entry (original, edit1, edit2)
    const originalEntry = historyEntries.nth(0);
    await expect(originalEntry).toContainText(originalComment);
    const edit1Entry = historyEntries.nth(1);
    await expect(edit1Entry).toContainText(edit1);
    const edit2Entry = historyEntries.nth(2);
    await expect(edit2Entry).toContainText(edit2);

    // Close the modal (click outside or cancel button – the modal has no explicit close, but we can press Esc)
    await test1Page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // ---------- Step 4: test1 deletes the quiz ----------
    await test1Page.click('[data-testid="delete-quiz-button"]');
    await test1Page.click('[data-testid="confirm-delete-quiz-button"]');
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/quiz`);

    // Clean up contexts
    await test1Context.close();
    await test2Context.close();
  });
});