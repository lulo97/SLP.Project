import { test, expect } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4000";

test.describe("Quiz comment and reply flow", () => {
  test("test1 creates quiz, test2 comments, test1 replies", async ({
    browser,
  }) => {
    // ---------- Step 1: test1 creates a new quiz ----------
    const test1Context = await browser.newContext();
    const test1Page = await test1Context.newPage();

    await test1Page.goto(`${FRONTEND_URL}/login`);
    await test1Page.fill('input[placeholder="Enter your username"]', "test1");
    await test1Page.fill('input[placeholder="Enter your password"]', "1");
    await test1Page.click('button[type="submit"]');
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await test1Page.goto(`${FRONTEND_URL}/quiz`);
    await test1Page.click('[data-testid="create-quiz-fab"]');

    const uniqueTitle = `Test Quiz ${Date.now()}`;
    await test1Page.fill('[data-testid="quiz-title-input"]', uniqueTitle);
    await test1Page.fill(
      '[data-testid="quiz-description-input"]',
      "A test quiz created by test1",
    );
    await test1Page.click('[data-testid="quiz-submit-button"]');

    // Capture quiz ID from URL (Wait for redirect after creation)
    await test1Page.waitForURL(/\/quiz\/\d+$/);
    const url = test1Page.url();
    const quizId = url.match(/\/quiz\/(\d+)/)?.[1];
    expect(quizId).toBeDefined();

    // ---------- Step 2: test2 comments on the quiz ----------
    const test2Context = await browser.newContext();
    const test2Page = await test2Context.newPage();

    await test2Page.goto(`${FRONTEND_URL}/login`);
    await test2Page.fill('input[placeholder="Enter your username"]', "test2");
    await test2Page.fill('input[placeholder="Enter your password"]', "2");
    await test2Page.click('button[type="submit"]');

    // Go directly to the public view of the quiz
    await test2Page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);

    const commentText = `Great quiz! Comment from test2 at ${Date.now()}`;
    await test2Page.fill('[data-testid="new-comment-input"]', commentText);
    await test2Page.click('[data-testid="submit-comment-button"]');

    // Verify and capture the specific Comment ID
    const commentLocator = test2Page
      .locator(`[data-testid^="comment-"]`)
      .filter({ hasText: commentText });
    await expect(commentLocator).toBeVisible();

    const commentIdAttr = await commentLocator.getAttribute("data-testid");
    // Extract numeric ID (e.g., "comment-45" -> "45")
    const numericCommentId = commentIdAttr?.split("-")[1];

    //Here make test 2 log out and test 1 log in back so test 1 can reply to comment of test 2

    // ---------- Step 3: test1 replies to test2's comment ----------
    // Bring test1 back to the public view page to see comments
    await test1Page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);

    // Locate the specific comment's reply button
    const specificComment = test1Page.locator(
      `[data-testid="comment-${numericCommentId}"]`,
    );
    const replyButton = specificComment.locator('[data-testid="reply-button"]');

    await replyButton.scrollIntoViewIfNeeded();
    await replyButton.click();

    // Fill the reply modal
    const replyInput = test1Page.locator('[data-testid="reply-input"]');
    await expect(replyInput).toBeVisible();
    const replyText = `Thanks test2! (reply from test1)`;
    await replyInput.fill(replyText);
    await test1Page.click('[data-testid="reply-modal-ok"]');

    // Verify the reply exists under the original comment thread
    const replyLocator = specificComment
      .locator('[data-testid^="comment-"]')
      .filter({ hasText: replyText });
    await expect(replyLocator).toBeVisible();

    // ---------- Step 4: Cleanup ----------
    await test1Page.goto(`${FRONTEND_URL}/quiz/${quizId}`); // Go to edit/manage page
    await test1Page.click('[data-testid="delete-quiz-button"]');
    await test1Page.click('[data-testid="confirm-delete-quiz-button"]');
    await expect(test1Page).toHaveURL(`${FRONTEND_URL}/quiz`);

    await test1Context.close();
    await test2Context.close();
  });
});
