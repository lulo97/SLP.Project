import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  login,
  logout,
  generateUniqueUser,
} from "../login/utils";
import { getUniqueTitle } from "../question/utils";

test("user A creates quiz B, posts comment C, admin deletes comment C, user A cannot see it, admin restores it, user A sees it again, cleanup", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const request = context.request;

  const userA = generateUniqueUser();
  const quizTitle = getUniqueTitle("Quiz B Comment Test");
  const commentText = `Comment C from user A at ${Date.now()}`;

  let userAId: number;
  let quizId: number;
  let commentId: number;
  let adminToken: string | null = null;

  // ── Step 1: API – Register user A ───────────────────────────────────────────
  await test.step("API: register user A", async () => {
    const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        username: userA.username,
        email: userA.email,
        password: userA.password,
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    userAId = body.id;
    expect(userAId).toBeDefined();
    console.log(`Registered user A: ${userA.username} (ID: ${userAId})`);
  });

  // ── Step 2: API – Admin logs in to get a persistent token ───────────────────
  // Do NOT use UI login + logout — logout() revokes the session on the backend,
  // killing the token before we can use it for later API calls.
  await test.step("API: admin login to obtain a persistent session token", async () => {
    const response = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: {
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password,
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    adminToken = body.token;
    expect(adminToken).toBeTruthy();
    console.log("Admin API token obtained — session kept alive for full test.");
  });

  // ── Step 3: UI – User A logs in and creates quiz B ──────────────────────────
  await test.step("UI: user A logs in", async () => {
    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  await test.step("UI: user A creates quiz B", async () => {
    await page.goto(`${FRONTEND_URL}/quiz`);
    await expect(page).toHaveURL(/\/quiz$/);

    await page.getByTestId("create-quiz-fab").click();
    await expect(page).toHaveURL(/\/quiz\/new/);

    await page.getByTestId("quiz-title-input").fill(quizTitle);
    await page
      .getByTestId("quiz-description-input")
      .fill("Quiz created by user A to test admin comment delete/restore");
    await page.getByTestId("quiz-visibility-public").check();

    // Optional tag
    const tagSelector = page.getByTestId("tag-selector");
    await tagSelector.click();
    const tagInput = tagSelector.locator("input");
    await tagInput.fill(`comment-admin-test-${Date.now()}`);
    await tagInput.press("Enter");
    await tagInput.press("Escape");

    await page.getByTestId("quiz-submit-button").click();

    // Extract quiz ID from redirect URL, e.g. /quiz/42
    await page.waitForURL(/\/quiz\/\d+$/);
    const match = page.url().match(/\/quiz\/(\d+)/);
    if (!match) throw new Error("Could not extract quiz ID from URL");
    quizId = parseInt(match[1], 10);

    await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
    console.log(`Quiz B created: "${quizTitle}" (ID: ${quizId})`);
  });

  // ── Step 4: UI – User A posts comment C on the quiz view page ───────────────
  await test.step("UI: user A posts comment C on quiz view page", async () => {
    await page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);
    await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

    // 1. Wait for visibility explicitly
    await page.getByTestId("new-comment-input").waitFor({ state: "visible" });

    // 2. Or use an assertion (best for tests)
    await expect(page.getByTestId("new-comment-input")).toBeVisible();

    // 3. Now perform the action
    await page.getByTestId("new-comment-input").fill(commentText);
    
    await page.waitForTimeout(1000);

    // Wait until Vue has synced the reactive value before submitting
    await expect(page.getByTestId("new-comment-input")).toHaveValue(
      commentText,
    );

    await page.getByTestId("submit-comment-button").click();

    // Wait for the comment to appear and capture its numeric ID
    const commentLocator = page
      .locator('[data-testid^="comment-"]')
      .filter({ hasText: commentText });

    await expect(commentLocator).toBeVisible();

    const commentIdAttr = await commentLocator.getAttribute("data-testid");

    const numericId = commentIdAttr?.split("-")[1];
    if (!numericId)
      throw new Error("Could not extract comment ID from data-testid");

    commentId = parseInt(numericId, 10);

    console.log(
      `✅ Success: Comment C posted: "${commentText}" (ID: ${commentId})`,
    );
  });

  await test.step("UI: user A logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 5: API – Admin deletes comment C ───────────────────────────────────
  await test.step("API: admin deletes comment C", async () => {
    const response = await request.delete(
      `${BACKEND_URL}/api/admin/comments/${commentId}`,
      { headers: { "X-Session-Token": adminToken! } },
    );
    expect(response.ok()).toBeTruthy();
    console.log(`Comment C (ID: ${commentId}) deleted by admin.`);
  });

  // ── Step 6: UI – User A cannot see comment C on the quiz view page ───────────
  await test.step("UI: user A logs in", async () => {
    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  await test.step("UI: user A cannot see deleted comment C on quiz view page", async () => {
    await page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);
    await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

    // The comment element must not be visible after admin deletion
    const commentLocator = page.locator(`[data-testid="comment-${commentId}"]`);
    await expect(commentLocator).not.toBeVisible();
    console.log("User A cannot see comment C — it has been deleted by admin.");
  });

  await test.step("UI: user A logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 7: API – Admin restores comment C ──────────────────────────────────
  await test.step("API: admin restores comment C", async () => {
    const response = await request.post(
      `${BACKEND_URL}/api/admin/comments/${commentId}/restore`,
      { headers: { "X-Session-Token": adminToken! } },
    );
    expect(response.ok()).toBeTruthy();
    console.log(`Comment C (ID: ${commentId}) restored by admin.`);
  });

  // ── Step 8: UI – User A can see comment C again on the quiz view page ────────
  await test.step("UI: user A logs in", async () => {
    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  await test.step("UI: user A sees comment C restored on quiz view page", async () => {
    await page.goto(`${FRONTEND_URL}/quiz/view/${quizId}`);
    await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

    // The comment must be visible again after admin restore
    const commentLocator = page.locator(`[data-testid="comment-${commentId}"]`);
    await expect(commentLocator).toBeVisible();
    await expect(commentLocator).toContainText(commentText);
    console.log(
      "User A can see comment C again — it has been restored by admin.",
    );
  });

  // ── Step 9: UI – User A deletes quiz B ──────────────────────────────────────
  await test.step("UI: user A deletes quiz B", async () => {
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

    await page.getByTestId("delete-quiz-button").click();
    await page.getByTestId("confirm-delete-quiz-button").click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/quiz`);
    await expect(
      page.locator(`[data-testid="quiz-list-item-${quizId}"]`),
    ).not.toBeVisible();
    console.log("User A deleted quiz B successfully.");
  });

  await test.step("UI: user A logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 10: API – Admin deletes user A ─────────────────────────────────────
  await test.step("API: admin deletes user A", async () => {
    const response = await request.delete(
      `${BACKEND_URL}/api/users/${userAId}`,
      { headers: { "X-Session-Token": adminToken! } },
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.message).toContain("User deleted successfully");
    console.log(`User A (ID: ${userAId}) deleted by admin.`);
  });

  // Clean up browser context
  await context.close();
});
