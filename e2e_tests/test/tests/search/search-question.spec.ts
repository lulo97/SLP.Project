import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  login,
  logout,
  generateUniqueUser,
  getSessionToken,
} from "../login/utils";

test("user A creates public question, user C finds it via search, user A deletes it, admin deletes users", async ({
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
  // 2. User A creates a public multiple‑choice question
  // ----------------------------------------------------------------------
  const questionTitle = `Public Question ${Date.now()}`;

  await test.step("User A: create public multiple‑choice question", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Navigate to question list and create new question
    await page.goto(`${FRONTEND_URL}/questions`);
    await page.getByTestId("create-question").click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/question/new`);

    // Fill common fields
    await page.getByTestId("question-title").fill(questionTitle);
    await page
      .getByTestId("question-description")
      .fill("Public question for search test");
    await page.getByTestId("question-type-select").click();
    await page.getByTestId("option-multiple-choice").click();
    await page
      .getByTestId("question-explanation")
      .fill("Explanation for search test");

    // Set visibility to public (assumes a radio group exists)
    await page.getByTestId("question-visibility-public").check();

    // Add options for multiple choice
    await page.getByTestId("mc-option-0-input").fill("First option");
    await page.getByTestId("mc-option-1-input").fill("Second option");
    await page.getByTestId("mc-option-0-checkbox").check(); // mark first as correct

    // Submit
    await page.getByTestId("submit-question").click();

    // Wait for redirection to question list and verify the question appears
    await expect(page).toHaveURL(`${FRONTEND_URL}/questions`);
    const searchInput = page.getByTestId("question-search");
    await searchInput.fill(questionTitle);
    await searchInput.press("Enter");
    await expect(
      page.locator(
        `[data-testid^="question-item-"]:has-text("${questionTitle}")`,
      ),
    ).toBeVisible();

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 3. User C searches for the question (All tab and Question tab)
  // ----------------------------------------------------------------------
  await test.step("User C: search for question on All and Question tabs", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userC.username, userC.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Go to search page
    await page.goto(`${FRONTEND_URL}/search`);

    // Perform search
    await page.getByTestId("search-input").fill(questionTitle);
    await page.getByTestId("search-input").press("Enter");

    // Wait for results to load
    await Promise.race([
      page.waitForSelector(
        `[data-testid^="search-result-item-"]:has-text("${questionTitle}")`,
        { timeout: 10000 },
      ),
      page.waitForSelector('[data-testid="search-no-results"]', {
        timeout: 10000,
      }),
    ]);

    // ----- Verify results in "All" tab (default) -----
    const questionResult = page.locator(
      `[data-testid^="search-result-item-"]:has-text("${questionTitle}")`,
    );
    await expect(questionResult).toBeVisible();

    // Verify the result has the correct type pill
    const typePill = questionResult.locator(
      '[data-testid="result-item-type-pill"]',
    );
    if ((await typePill.count()) === 0) {
      await expect(questionResult.getByText(/question/i)).toBeVisible();
    } else {
      await expect(typePill).toHaveText(/question/i);
    }

    // Verify visibility badge shows "public"
    const visibilityBadge = questionResult.locator(
      '[data-testid="result-visibility-public"]',
    );
    if ((await visibilityBadge.count()) === 0) {
      await expect(questionResult.getByText("public")).toBeVisible();
    } else {
      await expect(visibilityBadge).toBeVisible();
    }

    // ----- Switch to "Question" tab and verify -----
    const questionTab = page.getByTestId("search-tab-question");
    if ((await questionTab.count()) === 0) {
      await page.getByRole("tab", { name: /question/i }).click();
    } else {
      await questionTab.click();
    }

    await expect(
      page.locator(
        `[data-testid^="search-result-item-"]:has-text("${questionTitle}")`,
      ),
    ).toBeVisible();

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 4. User A deletes the question
  // ----------------------------------------------------------------------
  await test.step("User A: delete the question", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await page.goto(`${FRONTEND_URL}/questions`);
    const searchInput = page.getByTestId("question-search");
    await searchInput.fill(questionTitle);
    await searchInput.press("Enter");

    const questionListItem = page.locator(
      `[data-testid^="question-item-"]:has-text("${questionTitle}")`,
    );
    await expect(questionListItem).toBeVisible();

    // Extract ID and click delete button
    const itemTestId = await questionListItem.getAttribute("data-testid");
    const questionId = itemTestId?.replace("question-item-", "");
    expect(questionId).toBeDefined();

    const deleteButton = page.getByTestId(`delete-question-btn-${questionId}`);
    await deleteButton.click();
    await page.getByRole("button", { name: "Yes" }).click();

    // Verify the question no longer appears in the list
    await expect(questionListItem).not.toBeVisible();

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 5. User C verifies the question no longer appears in search
  // ----------------------------------------------------------------------
  await test.step("User C: verify question is gone from search results", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userC.username, userC.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    await page.goto(`${FRONTEND_URL}/search`);
    await page.getByTestId("search-input").fill(questionTitle);
    await page.getByTestId("search-input").press("Enter");

    await page.waitForSelector('[data-testid="search-no-results"]', {
      timeout: 10000,
    });

    const noResults = page.getByTestId("search-no-results");
    await expect(noResults).toBeVisible();

    const questionResult = page.locator(
      `[data-testid^="search-result-item-"]:has-text("${questionTitle}")`,
    );
    await expect(questionResult).not.toBeVisible();

    await context.close();
  });

  // ----------------------------------------------------------------------
  // 6. Admin deletes user A and user C (cleanup)
  // ----------------------------------------------------------------------
  await test.step("Admin: delete user A and user C via API", async () => {
    const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(FRONTEND_URL);
    await login(
      adminPage,
      ADMIN_CREDENTIALS.username,
      ADMIN_CREDENTIALS.password,
    );
    await expect(adminPage).toHaveURL(`${FRONTEND_URL}/dashboard`);

    const adminToken = await getSessionToken(adminPage);
    expect(adminToken).toBeTruthy();

    // Delete User A
    const deleteAResponse = await adminPage.request.delete(
      `${BACKEND_URL}/api/users/${userIdA}`,
      {
        headers: {
          "X-Session-Token": adminToken!,
        },
      },
    );
    expect(deleteAResponse.ok()).toBeTruthy();

    // Delete User C
    const deleteCResponse = await adminPage.request.delete(
      `${BACKEND_URL}/api/users/${userIdC}`,
      {
        headers: {
          "X-Session-Token": adminToken!,
        },
      },
    );
    expect(deleteCResponse.ok()).toBeTruthy();

    await logout(adminPage);
    await adminContext.close();
  });
});
