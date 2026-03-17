import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  API_BASE_URL,
  ADMIN_USER,
  login,
  loginAsAdmin,
  createQuiz,
  deleteQuiz,
} from "./admin-helpers.js";

/**
 * Creates an authenticated page by injecting the session token into localStorage.
 */
async function createAuthenticatedPage(browser, token, targetUrl) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript((sessionToken) => {
    localStorage.setItem("session_token", sessionToken);
  }, token);

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  return page;
}

test.describe("Comment flow with multiple users", () => {
  let adminToken;
  let quiz;
  const testUsers = [
    { username: "test1", password: "1" },
    { username: "test2", password: "1" },
    { username: "test3", password: "1" },
  ];

  // Setup: create a public quiz as admin
  test.beforeAll(async ({ request }) => {
    console.log("--- Setup: create public quiz ---");
    adminToken = await loginAsAdmin(request);
    quiz = await createQuiz(request, adminToken, `Public Quiz ${Date.now()}`, {
      visibility: "public",
    });
    console.log(`Quiz created with ID: ${quiz.id}`);
  });

  // Cleanup: delete the quiz after test
  test.afterAll(async ({ request }) => {
    console.log("--- Cleanup: delete quiz ---");
    await deleteQuiz(request, adminToken, quiz.id);
  });

  test("Users can add, reply, edit, and delete their own comments", async ({
    browser,
    request,
  }) => {
    console.log("=== Starting test ===");

    // ---------- Step 1: test1 adds a top-level comment and a reply ----------
    console.log("Step 1: test1 adds comment and reply");
    const token1 = await login(
      request,
      testUsers[0].username,
      testUsers[0].password,
    );
    console.log("test1 token obtained");
    const page1 = await createAuthenticatedPage(
      browser,
      token1,
      `${FRONTEND_URL}/quiz/view/${quiz.id}`,
    );
    console.log("test1 page loaded");

    await expect(page1.locator('[data-testid="quiz-title"]')).toHaveText(
      quiz.title,
    );

    // Add top-level comment
    const comment1Content = `Comment from test1 at ${Date.now()}`;
    console.log(`test1 adding comment: "${comment1Content}"`);
    await addComment(page1, comment1Content);
    const comment1Locator = page1
      .locator(`[data-testid^="comment-"]:has-text("${comment1Content}")`)
      .first();
    await expect(comment1Locator).toBeVisible();
    const comment1Id = (
      await comment1Locator.getAttribute("data-testid")
    ).split("-")[1];
    console.log(`test1 comment ID: ${comment1Id}`);

    // Add a reply
    const replyContent = `Reply from test1 at ${Date.now()}`;
    console.log(`test1 adding reply to comment ${comment1Id}: "${replyContent}"`);
    await addReply(page1, comment1Id, replyContent);
    const replyLocator = page1
      .locator(`[data-testid^="comment-"]:has-text("${replyContent}")`)
      .first();
    await expect(replyLocator).toBeVisible();
    const replyId = (await replyLocator.getAttribute("data-testid")).split(
      "-",
    )[1];
    console.log(`test1 reply ID: ${replyId}`);

    // ---------- Step 2: test2 adds a comment and replies to test1's comment ----------
    console.log("Step 2: test2 adds comment and reply to test1");
    const token2 = await login(
      request,
      testUsers[1].username,
      testUsers[1].password,
    );
    console.log("test2 token obtained");
    const page2 = await createAuthenticatedPage(
      browser,
      token2,
      `${FRONTEND_URL}/quiz/view/${quiz.id}`,
    );
    console.log("test2 page loaded");

    // Add test2's own comment
    const comment2Content = `Comment from test2 at ${Date.now()}`;
    console.log(`test2 adding comment: "${comment2Content}"`);
    await addComment(page2, comment2Content);
    const comment2Locator = page2
      .locator(`[data-testid^="comment-"]:has-text("${comment2Content}")`)
      .first();
    await expect(comment2Locator).toBeVisible();
    const comment2Id = (
      await comment2Locator.getAttribute("data-testid")
    ).split("-")[1];
    console.log(`test2 comment ID: ${comment2Id}`);

    // test2 replies to test1's comment
    const replyFromTest2 = `Reply from test2 to test1 at ${Date.now()}`;
    console.log(`test2 adding reply to test1's comment ${comment1Id}: "${replyFromTest2}"`);
    await addReply(page2, comment1Id, replyFromTest2);
    const reply2Locator = page2
      .locator(`[data-testid^="comment-"]:has-text("${replyFromTest2}")`)
      .first();
    await expect(reply2Locator).toBeVisible();
    console.log("test2 reply added");

    // ---------- Step 3: test3 adds a comment ----------
    console.log("Step 3: test3 adds comment");
    const token3 = await login(
      request,
      testUsers[2].username,
      testUsers[2].password,
    );
    console.log("test3 token obtained");
    const page3 = await createAuthenticatedPage(
      browser,
      token3,
      `${FRONTEND_URL}/quiz/view/${quiz.id}`,
    );
    console.log("test3 page loaded");

    const comment3Content = `Comment from test3 at ${Date.now()}`;
    console.log(`test3 adding comment: "${comment3Content}"`);
    await addComment(page3, comment3Content);
    const comment3Locator = page3
      .locator(`[data-testid^="comment-"]:has-text("${comment3Content}")`)
      .first();
    await expect(comment3Locator).toBeVisible();
    const comment3Id = (
      await comment3Locator.getAttribute("data-testid")
    ).split("-")[1];
    console.log(`test3 comment ID: ${comment3Id}`);

    // ---------- Step 4: test1 edits its own comment ----------
    console.log(`Step 4: test1 edits comment ${comment1Id}`);
    const editedContent = `Edited comment from test1 at ${Date.now()}`;
    await editComment(page1, comment1Id, editedContent);
    await expect(
      page1.locator(
        `[data-testid="comment-${comment1Id}"] [data-testid="comment-edited-indicator"]`,
      ),
    ).toBeVisible();
    console.log("test1 comment edited");

    // ---------- Step 5: test2 tries to edit test1's comment (should not be allowed) ----------
    console.log(`Step 5: test2 attempts to edit test1's comment ${comment1Id} (should be forbidden)`);
    const test1CommentOnPage2 = page2.locator(
      `[data-testid="comment-${comment1Id}"]`,
    );
    await expect(
      test1CommentOnPage2.locator(
        '> .ant-comment .ant-comment-actions [data-testid="edit-button"]',
      ),
    ).toHaveCount(0);
    console.log("Step 5 passed: edit button not present");

    // ---------- Step 6: test1 deletes its reply ----------
    console.log(`Step 6: test1 deletes its reply ${replyId}`);
    await deleteComment(page1, replyId);
    await expect(
      page1.locator(`[data-testid="comment-${replyId}"]`),
    ).toHaveCount(0);
    console.log("test1 reply deleted");

    // ---------- Step 7: test2 deletes its own comment ----------
    console.log(`Step 7: test2 deletes its own comment ${comment2Id}`);
    await deleteComment(page2, comment2Id);
    await expect(
      page2.locator(`[data-testid="comment-${comment2Id}"]`),
    ).toHaveCount(0);
    console.log("test2 comment deleted");

    // ---------- Step 8: test3 tries to delete test1's comment (should not be allowed) ----------
    console.log(`Step 8: test3 attempts to delete test1's comment ${comment1Id} (should be forbidden)`);
    const test1CommentOnPage3 = page3.locator(
      `[data-testid="comment-${comment1Id}"]`,
    );
    await expect(
      test1CommentOnPage3.locator(
        '> .ant-comment .ant-comment-actions [data-testid="delete-button"]',
      ),
    ).toHaveCount(0);
    console.log("Step 8 passed: delete button not present");

    // ---------- Step 9: test1 deletes its top-level comment ----------
    console.log(`Step 9: test1 deletes its top-level comment ${comment1Id}`);
    
    await deleteComment(page1, comment1Id);
    await expect(
      page1.locator(`[data-testid="comment-${comment1Id}"]`),
    ).toHaveCount(0);
    console.log("test1 top-level comment deleted");

    // test3's comment remains
    console.log(`Verifying test3 comment ${comment3Id} still visible`);
    await expect(
      page3.locator(`[data-testid="comment-${comment3Id}"]`),
    ).toBeVisible();
    console.log("test3 comment visible");

    // test3 deletes its own comment
    console.log(`Step 10: test3 deletes its own comment ${comment3Id}`);
    await deleteComment(page3, comment3Id);
    await expect(
      page3.locator(`[data-testid="comment-${comment3Id}"]`),
    ).toHaveCount(0);
    console.log("test3 comment deleted");

    // Close pages
    await page1.close();
    await page2.close();
    await page3.close();

    console.log("=== Test finished ===");
  });
});

// Helper functions with logging
async function addComment(page, content) {
  console.log(`  [addComment] filling textarea with "${content}"`);
  await page.fill('[data-testid="new-comment-input"]', content);
  console.log(`  [addComment] clicking submit button`);
  await page.click('[data-testid="submit-comment-button"]');
  console.log(`  [addComment] waiting for comment text to appear`);
  await expect(page.locator(`text=${content}`).first()).toBeVisible({
    timeout: 5000,
  });
  console.log(`  [addComment] comment added successfully`);
}

async function addReply(page, parentCommentId, content) {
  console.log(`  [addReply] clicking reply button on comment ${parentCommentId}`);
  await page.click(
    `[data-testid="comment-${parentCommentId}"] [data-testid="reply-button"]`,
  );

  console.log(`  [addReply] waiting for reply input to appear`);
  await expect(page.locator('[data-testid="reply-input"]')).toBeVisible({
    timeout: 5000,
  });

  console.log(`  [addReply] filling reply textarea with "${content}"`);
  await page.fill('[data-testid="reply-input"]', content);
  console.log(`  [addReply] clicking reply-modal-ok button`);
  await page.click('[data-testid="reply-modal-ok"]');

  console.log(`  [addReply] waiting for reply input to disappear`);
  await expect(page.locator('[data-testid="reply-input"]')).not.toBeVisible({
    timeout: 5000,
  });

  console.log(`  [addReply] waiting for reply text to appear`);
  await expect(page.locator(`text=${content}`).first()).toBeVisible({
    timeout: 5000,
  });
  console.log(`  [addReply] reply added successfully`);
}

async function editComment(page, commentId, newContent) {
  console.log(`  [editComment] editing comment ${commentId}`);
  const commentLocator = page.locator(`[data-testid="comment-${commentId}"]`);
  console.log(`  [editComment] clicking edit button`);
  await commentLocator.locator('[data-testid="edit-button"]').first().click();
  console.log(`  [editComment] waiting for edit-comment-input`);
  await expect(
    commentLocator.locator('[data-testid="edit-comment-input"]'),
  ).toBeVisible();
  console.log(`  [editComment] filling with "${newContent}"`);
  await commentLocator
    .locator('[data-testid="edit-comment-input"]')
    .fill(newContent);
  console.log(`  [editComment] clicking save-edit-button`);
  await commentLocator.locator('[data-testid="save-edit-button"]').click();
  console.log(`  [editComment] waiting for new content to appear`);
  await expect(commentLocator.locator(`text=${newContent}`)).toBeVisible();
  console.log(`  [editComment] edit successful`);
}

async function deleteComment(page, commentId) {
  console.log(`  [deleteComment] deleting comment ${commentId}`);
  const commentLocator = page.locator(`[data-testid="comment-${commentId}"]`);
  console.log(`  [deleteComment] clicking delete button`);
  await commentLocator.locator('[data-testid="delete-button"]').first().click();
  console.log(`  [deleteComment] waiting for popconfirm`);
  const popconfirm = page.locator(".ant-popconfirm");
  await expect(popconfirm).toBeVisible();
  console.log(`  [deleteComment] clicking confirm button`);
  await popconfirm.locator(".ant-btn-primary").click();
  console.log(`  [deleteComment] waiting for comment to disappear`);
  await expect(commentLocator).not.toBeVisible({ timeout: 5000 });
  console.log(`  [deleteComment] comment deleted`);
}