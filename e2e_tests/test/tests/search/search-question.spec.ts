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
  test.setTimeout(120000);

  // 1. Create users via API
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

    const respC = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: userC,
    });
    expect(respC.ok()).toBeTruthy();
    const dataC = await respC.json();
    userIdC = dataC.id;

    await context.close();
  });

  // 2. User A creates a public multiple‑choice question
  const questionTitle = `Public Question ${Date.now()}`;

  await test.step("User A: create public multiple‑choice question", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);

    await page.goto(`${FRONTEND_URL}/questions`);
    await page.getByTestId("create-question").click();

    // Fill common fields
    await page.getByTestId("question-title").fill(questionTitle);
    await page
      .getByTestId("question-description")
      .fill("Public question for search test");

    // Select Type
    await page.getByTestId("question-type-select").click();
    await page.getByTestId("option-multiple-choice").click();

    // FIX: Ensure dropdown is closed so it doesn't block visibility buttons
    await page.keyboard.press("Escape");

    await page
      .getByTestId("question-explanation")
      .fill("Explanation for search test");

    // Handle options (Removing extra default options if necessary, based on your reference test)
    // Your UI seems to have 4 options by default. Let's fill 2 and leave/remove others.
    await page.getByTestId("mc-option-0-input").fill("First option");
    await page.getByTestId("mc-option-0-checkbox").check();
    await page.getByTestId("mc-option-1-input").fill("Second option");

    // Submit
    await page.getByTestId("submit-question").click();

    // Verify redirect and appearance
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

  // 3. User C searches for the question
  await test.step("User C: search for question on All and Question tabs", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userC.username, userC.password);

    await page.goto(`${FRONTEND_URL}/search`);
    await page.getByTestId("search-input").fill(questionTitle);
    await page.getByTestId("search-input").press("Enter");

    // Wait for result with a generous timeout for search indexing
    const resultLocator = page.locator(
      `[data-testid^="search-result-item-"]:has-text("${questionTitle}")`,
    );
    await expect(resultLocator).toBeVisible({ timeout: 15000 });

    // Switch to Question tab to verify filtering
    const questionTab = page.getByTestId("search-tab-question");
    if (await questionTab.isVisible()) {
      await questionTab.click();
    } else {
      await page.getByRole("tab", { name: /question/i }).click();
    }

    await expect(resultLocator).toBeVisible();
    await context.close();
  });

  // 4. User A deletes the question
  await test.step("User A: delete the question", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await page.goto(`${FRONTEND_URL}/questions`);

    const searchInput = page.getByTestId("question-search");
    await searchInput.fill(questionTitle);
    await searchInput.press("Enter");

    const item = page.locator(
      `[data-testid^="question-item-"]:has-text("${questionTitle}")`,
    );
    const itemTestId = await item.getAttribute("data-testid");
    const questionId = itemTestId?.replace("question-item-", "");

    await page.getByTestId(`delete-question-btn-${questionId}`).click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(item).not.toBeVisible();

    await context.close();
  });

  // 5. User C verifies removal
  await test.step("User C: verify question is gone from search", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userC.username, userC.password);
    await page.goto(`${FRONTEND_URL}/search`);

    await page.getByTestId("search-input").fill(questionTitle);
    await page.getByTestId("search-input").press("Enter");

    await expect(page.getByTestId("search-no-results")).toBeVisible({
      timeout: 10000,
    });
    await context.close();
  });

  // 6. Cleanup
  await test.step("Admin: delete users", async () => {
    const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(FRONTEND_URL);
    await login(
      adminPage,
      ADMIN_CREDENTIALS.username,
      ADMIN_CREDENTIALS.password,
    );

    const adminToken = await getSessionToken(adminPage);

    for (const id of [userIdA, userIdC]) {
      await adminPage.request.delete(`${BACKEND_URL}/api/users/${id}`, {
        headers: { "X-Session-Token": adminToken! },
      });
    }

    await adminContext.close();
  });
});
