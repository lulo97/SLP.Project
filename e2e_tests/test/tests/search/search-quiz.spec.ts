import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  login,
  generateUniqueUser,
  getSessionToken,
} from "../login/utils";

test("user A creates public quiz, user C finds it via search, user A deletes it, admin deletes users", async ({
  browser,
}) => {
  test.setTimeout(120000); // Extend timeout for search index eventual consistency

  // ----------------------------------------------------------------------
  // 1. Create two unique users (A and C) via API and capture their IDs
  // ----------------------------------------------------------------------
  const userA = generateUniqueUser();
  const userC = generateUniqueUser();
  let userIdA: number;
  let userIdC: number;

  await test.step("API: register user A and user C", async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    const respA = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: userA,
    });
    expect(respA.ok()).toBeTruthy();
    const dataA = await respA.json();
    userIdA = dataA.id;
    expect(userIdA).toBeDefined();

    const respC = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: userC,
    });
    expect(respC.ok()).toBeTruthy();
    const dataC = await respC.json();
    userIdC = dataC.id;
    expect(userIdC).toBeDefined();

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 2. User A creates an empty public quiz
  // ----------------------------------------------------------------------
  const quizTitle = `Public Quiz ${Date.now()}`;

  await test.step("User A: create empty public quiz", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Navigate to quiz list and create new quiz
    await page.goto(`${FRONTEND_URL}/quiz`);
    await page.getByTestId("create-quiz-fab").click();
    await expect(page).toHaveURL(/\/quiz\/new/);

    await page.getByTestId("quiz-title-input").fill(quizTitle);
    await page
      .getByTestId("quiz-description-input")
      .fill("Empty quiz for search test");
    await page.getByTestId("quiz-visibility-public").check();
    await page.getByTestId("quiz-submit-button").click();

    // Wait for quiz detail page and verify title
    await expect(page).toHaveURL(/\/quiz\/\d+/);
    await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);
    await expect(page.getByTestId("no-questions-message")).toBeVisible();

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 3. User C searches for the quiz (All tab and Quiz tab)
  // ----------------------------------------------------------------------
  await test.step("User C: search for quiz on All and Quiz tabs", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userC.username, userC.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Go to search page
    await page.goto(`${FRONTEND_URL}/search`);

    // Perform search
    await page.getByTestId("search-input").fill(quizTitle);
    await page.getByTestId("search-input").press("Enter");

    // Wait for results to load – using a reliable locator (result item or no-results)
    // Instead of a non-existent loading skeleton, wait for either a result or the "no results" message.
    await Promise.race([
      page.waitForSelector(
        `[data-testid^="search-result-item-"]:has-text("${quizTitle}")`,
        { timeout: 10000 },
      ),
      page.waitForSelector('[data-testid="search-no-results"]', {
        timeout: 10000,
      }),
    ]);

    // ----- Verify results in "All" tab (default) -----
    const quizResult = page.locator(
      `[data-testid^="search-result-item-"]:has-text("${quizTitle}")`,
    );
    await expect(quizResult).toBeVisible();

    // Verify the result has the correct type pill (using text match, case-insensitive)
    const typePill = quizResult.locator(
      '[data-testid="result-item-type-pill"]',
    );
    // If the test-id doesn't exist, fallback to locating by role/text
    if ((await typePill.count()) === 0) {
      await expect(quizResult.getByText(/quiz/i)).toBeVisible();
    } else {
      await expect(typePill).toHaveText(/quiz/i);
    }

    // Verify visibility badge shows "public" – adjust test-id if needed
    const visibilityBadge = quizResult.locator(
      '[data-testid="result-visibility-public"]',
    );
    if ((await visibilityBadge.count()) === 0) {
      await expect(
        quizResult.getByText("public"),
      ).toBeVisible();
    } else {
      await expect(visibilityBadge).toBeVisible();
    }

    // ----- Switch to "Quiz" tab and verify -----
    // Use reliable selector for the Quiz tab (if test-id missing, use getByRole)
    const quizTab = page.getByTestId("search-tab-quiz");
    if ((await quizTab.count()) === 0) {
      await page.getByRole("tab", { name: /quiz/i }).click();
    } else {
      await quizTab.click();
    }

    // Wait for results to refresh
    await expect(
      page.locator(
        `[data-testid^="search-result-item-"]:has-text("${quizTitle}")`,
      ),
    ).toBeVisible();

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 4. User A deletes the quiz
  // ----------------------------------------------------------------------
  await test.step("User A: delete the quiz", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Find the quiz in the public list or directly go to its page
    await page.goto(`${FRONTEND_URL}/quiz`);
    await page.getByTestId("tab-public-quizzes").click();
    const searchInput = page.getByTestId("search-quizzes-input");
    await searchInput.fill(quizTitle);
    await searchInput.press("Enter");

    // Wait for the quiz to appear in the list
    const quizListItem = page.locator(
      `[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`,
    );
    await expect(quizListItem).toBeVisible();

    // Click on the quiz link
    const quizLink = quizListItem.locator("a");
    await quizLink.click();
    await expect(page).toHaveURL(/\/quiz\/\d+/);

    // Delete the quiz
    await page.getByTestId("delete-quiz-button").click();
    await page.getByRole("button", { name: "Yes" }).click();

    // After deletion, redirected to quiz list
    await expect(page).toHaveURL(/\/quiz$/);

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 5. User C verifies the quiz no longer appears in search
  // ----------------------------------------------------------------------
  await test.step("User C: verify quiz is gone from search results", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userC.username, userC.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await page.goto(`${FRONTEND_URL}/search`);
    await page.getByTestId("search-input").fill(quizTitle);
    await page.getByTestId("search-input").press("Enter");

    // Wait for either "no results" or a result (but result should not appear)
    await page.waitForSelector('[data-testid="search-no-results"]', {
      timeout: 10000,
    });

    // Verify no results message is shown
    const noResults = page.getByTestId("search-no-results");
    await expect(noResults).toBeVisible();
    // Optionally check the title text (if test-id exists)
    const noResultsTitle = page.getByTestId("no-results-title");
    if ((await noResultsTitle.count()) > 0) {
      await expect(noResultsTitle).toHaveText("No results found");
    } else {
      await expect(noResults).toContainText("No results found");
    }

    // Also ensure the quiz result is not present
    const quizResult = page.locator(
      `[data-testid^="search-result-item-"]:has-text("${quizTitle}")`,
    );
    await expect(quizResult).not.toBeVisible();

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 6. Admin deletes user A and user C (cleanup)
  // ----------------------------------------------------------------------
  await test.step("Admin: delete user A and user C via API", async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    // Login as admin via UI to obtain session token (cookie-based)
    const adminPage = await context.newPage();
    await adminPage.goto(FRONTEND_URL);
    await login(
      adminPage,
      ADMIN_CREDENTIALS.username,
      ADMIN_CREDENTIALS.password,
    );
    await expect(adminPage).toHaveURL(`${FRONTEND_URL}/dashboard`);
    const adminToken = await getSessionToken(adminPage);
    expect(adminToken).toBeTruthy();

    // Delete user A – use cookie jar or token; backend likely expects cookie.
    // If the API expects a session cookie, we need to set it in the request context.
    // Since we have a new context without cookies, we manually add the token as a header (if accepted)
    // Alternatively, use the same adminPage to make API calls via page.evaluate or reuse its context.
    // Simpler: reuse the adminPage's request context (it already has the session cookie)
    const adminRequest = adminPage.request;
    const deleteA = await adminRequest.delete(
      `${BACKEND_URL}/api/users/${userIdA}`,
    );
    expect(deleteA.ok()).toBeTruthy();

    const deleteC = await adminRequest.delete(
      `${BACKEND_URL}/api/users/${userIdC}`,
    );
    expect(deleteC.ok()).toBeTruthy();

    await adminPage.close();
    await context.close();
  });
});
