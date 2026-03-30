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

test("user A creates quiz B, admin disables it, user C cannot find it, admin enables it, user C can find it, user A deletes it, admin cleans up users", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const request = context.request;

  const userA = generateUniqueUser();
  const userC = generateUniqueUser();
  const quizTitle = getUniqueTitle("Quiz B Disable Test");

  let userAId: number;
  let userCId: number;
  let quizId: number;
  let adminToken: string | null = null;

  // ── Step 1: API – Register user A and user C ────────────────────────────────
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

  await test.step("API: register user C", async () => {
    const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        username: userC.username,
        email: userC.email,
        password: userC.password,
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    userCId = body.id;
    expect(userCId).toBeDefined();
    console.log(`Registered user C: ${userC.username} (ID: ${userCId})`);
  });

  // ── Step 2: API – Admin logs in via API to obtain a token ───────────────────
  // We deliberately avoid UI login + logout here.
  // The UI logout() calls POST /auth/logout which revokes the session on the
  // backend, making any previously captured token useless for later API calls.
  // By logging in through the API directly we keep this session alive for the
  // entire test without touching the browser page at all.
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

    const createFab = page.getByTestId("create-quiz-fab");
    await createFab.click();
    await expect(page).toHaveURL(/\/quiz\/new/);

    await page.getByTestId("quiz-title-input").fill(quizTitle);
    await page
      .getByTestId("quiz-description-input")
      .fill("Quiz created by user A to test disable/enable flow");
    await page.getByTestId("quiz-visibility-public").check();

    // Optional tag
    const tagSelector = page.getByTestId("tag-selector");
    await tagSelector.click();
    const tagInput = tagSelector.locator("input");
    await tagInput.fill(`disable-test-${Date.now()}`);
    await tagInput.press("Enter");
    await tagInput.press("Escape");

    await page.getByTestId("quiz-submit-button").click();

    // Extract quiz ID from the redirect URL, e.g. /quiz/42
    await expect(page).toHaveURL(/\/quiz\/\d+/);
    const match = page.url().match(/\/quiz\/(\d+)/);
    if (!match) throw new Error("Could not extract quiz ID from URL");
    quizId = parseInt(match[1], 10);

    await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
    console.log(`Quiz B created: "${quizTitle}" (ID: ${quizId})`);
  });

  await test.step("UI: user A logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 4: API – Admin disables quiz B ─────────────────────────────────────
  await test.step("API: admin disables quiz B", async () => {
    const response = await request.post(
      `${BACKEND_URL}/api/admin/quizzes/${quizId}/disable`,
      { headers: { "X-Session-Token": adminToken! } },
    );
    expect(response.ok()).toBeTruthy();
    console.log(`Quiz B (ID: ${quizId}) disabled by admin.`);
  });

  // ── Step 5: UI – User A still sees quiz B but it is marked as disabled ───────
  await test.step("UI: user A logs in", async () => {
    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  await test.step("UI: user A sees quiz B marked as disabled on the detail page", async () => {
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/quiz/${quizId}`);

    const disabledBadge = page.getByTestId("quiz-disabled-badge");
    await expect(disabledBadge).toBeVisible();
    console.log("User A can see quiz B — it is marked as disabled.");
  });

  await test.step("UI: user A logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 6: UI – User C searches for quiz B; it must not appear ──────────────
  await test.step("UI: user C logs in", async () => {
    await page.goto(FRONTEND_URL);
    await login(page, userC.username, userC.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  await test.step("UI: user C searches for quiz B and finds no results", async () => {
    await page.goto(`${FRONTEND_URL}/search`);

    const searchInput = page.getByTestId("search-input");
    await searchInput.fill(quizTitle);
    await searchInput.press("Enter");

    // Wait for loading skeleton to disappear
    await expect(page.getByTestId("search-loading-skeleton")).not.toBeVisible({
      timeout: 10000,
    });

    // Either the global no-results state is shown, or the specific item is absent
    const noResults = page.getByTestId("search-no-results");
    const matchingResult = page.getByTestId(`search-result-item-${quizId}`);

    const noResultsVisible = await noResults.isVisible();
    const matchVisible = await matchingResult.isVisible();

    expect(noResultsVisible || !matchVisible).toBeTruthy();
    console.log("User C cannot find disabled quiz B in search results.");
  });

  await test.step("UI: user C logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 7: API – Admin enables quiz B ──────────────────────────────────────
  await test.step("API: admin enables quiz B", async () => {
    const response = await request.post(
      `${BACKEND_URL}/api/admin/quizzes/${quizId}/enable`,
      { headers: { "X-Session-Token": adminToken! } },
    );
    expect(response.ok()).toBeTruthy();
    console.log(`Quiz B (ID: ${quizId}) re-enabled by admin.`);
  });

  // ── Step 8: UI – User A sees quiz B is no longer disabled ───────────────────
  await test.step("UI: user A logs in", async () => {
    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  await test.step("UI: user A sees quiz B is enabled again on the detail page", async () => {
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/quiz/${quizId}`);

    const disabledBadge = page.getByTestId("quiz-disabled-badge");
    await expect(disabledBadge).not.toBeVisible();
    console.log("User A sees quiz B is enabled — no disabled badge.");
  });

  await test.step("UI: user A logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 9: UI – User C searches; quiz B must now appear ────────────────────
  await test.step("UI: user C logs in", async () => {
    await page.goto(FRONTEND_URL);
    await login(page, userC.username, userC.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  await test.step("UI: user C searches for quiz B and finds it", async () => {
    await page.goto(`${FRONTEND_URL}/search`);

    const searchInput = page.getByTestId("search-input");
    await searchInput.fill(quizTitle);
    await searchInput.press("Enter");

    // Wait for loading skeleton to disappear
    await expect(page.getByTestId("search-loading-skeleton")).not.toBeVisible({
      timeout: 10000,
    });

    const matchingResult = page.getByTestId(`search-result-item-${quizId}`);
    await expect(matchingResult).toBeVisible();
    console.log("User C can now find re-enabled quiz B in search results.");
  });

  await test.step("UI: user C logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 10: UI – User A logs in and deletes quiz B ─────────────────────────
  await test.step("UI: user A logs in", async () => {
    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  await test.step("UI: user A deletes quiz B", async () => {
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

    await page.getByTestId("delete-quiz-button").click();

    const confirmButton = page.getByRole("button", { name: "Yes" });
    await confirmButton.click();

    await expect(page).toHaveURL(/\/quiz$/);

    // Confirm it's gone from the public tab
    await page.getByTestId("tab-public-quizzes").click();
    const searchInput = page.getByTestId("search-quizzes-input");
    await searchInput.fill(quizTitle);
    await searchInput.press("Enter");

    const quizItem = page.locator(
      `[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`,
    );
    await expect(quizItem).not.toBeVisible();
    console.log("User A deleted quiz B successfully.");
  });

  await test.step("UI: user A logs out", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ── Step 11: API – Admin deletes user A and user C ──────────────────────────
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

  await test.step("API: admin deletes user C", async () => {
    const response = await request.delete(
      `${BACKEND_URL}/api/users/${userCId}`,
      { headers: { "X-Session-Token": adminToken! } },
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.message).toContain("User deleted successfully");
    console.log(`User C (ID: ${userCId}) deleted by admin.`);
  });

  // Clean up browser context
  await context.close();
});
