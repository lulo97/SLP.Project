

import { test, expect } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3009";

test.describe("Comment CRUD flow", () => {
  test("test1 creates quiz, adds comment, edits comment, deletes comment, deletes quiz", async ({
    page,
  }) => {
    // ---------- Step 1: Login as test1 ----------
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[placeholder="Enter your username"]', "test1");
    await page.fill('input[placeholder="Enter your password"]', "1");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // ---------- Step 2: Create a new quiz ----------
    await page.goto(`${FRONTEND_URL}/quiz`);
    await page.click('[data-testid="create-quiz-fab"]');

    const uniqueTitle = `Test Quiz ${Date.now()}`;
    await page.fill('[data-testid="quiz-title-input"]', uniqueTitle);
    await page.fill(
      '[data-testid="quiz-description-input"]',
      "A test quiz for comment CRUD",
    );
    await page.click('[data-testid="quiz-submit-button"]');

    // Wait for redirect to quiz detail page and capture quiz ID
    await page.waitForURL(/\/quiz\/\d+$/);
    const url = page.url();
    const quizId = url.match(/\/quiz\/(\d+)/)?.[1];
    expect(quizId).toBeDefined();

    // ---------- Step 3: Go to public view to add a comment ----------
    await page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);
    await expect(page.getByTestId("quiz-title")).toHaveText(uniqueTitle);

    // Add a comment
    const commentText = `Initial comment from test1 at ${Date.now()}`;
    await page.fill('[data-testid="new-comment-input"]', commentText);
    await page.click('[data-testid="submit-comment-button"]');

    // Locate the comment and capture its ID
    const commentLocator = page
      .locator('[data-testid^="comment-"]')
      .filter({ hasText: commentText });
    await expect(commentLocator).toBeVisible();
    const commentIdAttr = await commentLocator.getAttribute("data-testid");
    const commentId = commentIdAttr?.split("-")[1];
    expect(commentId).toBeDefined();

    // ---------- Step 4: Edit the comment ----------
    // Click the edit button inside the comment
    await commentLocator.locator('[data-testid="edit-button"]').click();

    // ---------- Step 4: Edit the comment ----------
    // 1. Get the stable ID locator
    const commentIdLocator = page.locator(
      `[data-testid="comment-${commentId}"]`,
    );

    // 2. Click edit
    await commentIdLocator.locator('[data-testid="edit-button"]').click();

    // 3. Instead of using the old 'commentLocator', use the stable ID locator
    // to find the textarea. This handles the "Detached from DOM" issue.
    const editInput = commentIdLocator.getByTestId("edit-comment-input");

    // Wait for it to be attached and visible
    await expect(editInput).toBeVisible();

    const editedText = `Edited comment: ${commentText}`;
    await editInput.fill(editedText);

    // Save the edit
    await commentIdLocator.getByTestId("save-edit-button").click();

    // Verify the comment content is updated
    await expect(commentLocator).toContainText(editedText);
    // Optional: verify the "edited" indicator appears
    await expect(
      commentLocator.locator('[data-testid="comment-edited-indicator"]'),
    ).toBeVisible();

    // ---------- Step 5: Delete the comment ----------
    // Click delete button inside the comment
    await commentLocator.locator('[data-testid="delete-button"]').click();
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-comment-button"]');

    // Verify the comment is no longer visible
    await expect(commentLocator).not.toBeVisible();

    // ---------- Step 6: Go back to owner detail page and delete the quiz ----------
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await page.click('[data-testid="delete-quiz-button"]');
    await page.click('[data-testid="confirm-delete-quiz-button"]');

    // After deletion, redirect to quiz list
    await expect(page).toHaveURL(`${FRONTEND_URL}/quiz`);
  });
});
