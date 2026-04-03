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

test("user A creates private question, searches for it, deletes it, admin deletes user", async ({
  browser,
}) => {
  test.setTimeout(180000);

  // 1. Create user A via API
  const userA = generateUniqueUser();
  let userIdA: number;

  await test.step("API: register user A", async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    const respA = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: userA,
    });
    expect(respA.ok()).toBeTruthy();
    const dataA = await respA.json();
    userIdA = dataA.id;

    await context.close();
  });

  // 2. User A creates a private multiple‑choice question
  const questionTitle = `Private Question ${Date.now()}`;

  await test.step("User A: create private multiple‑choice question", async () => {
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
      .fill("Private question for search test");

    // Select Type
    await page.getByTestId("question-type-select").click();
    await page.getByTestId("option-multiple-choice").click();

    // Close dropdown
    await page.keyboard.press("Escape");

    await page
      .getByTestId("question-explanation")
      .fill("Explanation for private search test");

    // Handle options
    await page.getByTestId("mc-option-0-input").fill("First option");
    await page.getByTestId("mc-option-0-checkbox").check();
    await page.getByTestId("mc-option-1-input").fill("Second option");

    // Submit
    await page.getByTestId("submit-question").click();

    // Verify redirect and appearance in user's own question list
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

  // 3. User A searches for the private question
  await test.step("User A: search for own private question", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);

    await page.goto(`${FRONTEND_URL}/search`);
    await page.getByTestId("search-input").fill(questionTitle);
    await page.getByTestId("search-input").press("Enter");

    // Wait for result
    const resultLocator = page.locator(
      `[data-testid^="search-result-item-"]:has-text("${questionTitle}")`,
    );
    await expect(resultLocator).toBeVisible({ timeout: 15000 });

    // Switch to Question tab to verify filtering (optional)
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

  // 5. User A verifies the question is gone from search
  await test.step("User A: verify question is removed from search", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, userA.username, userA.password);
    await page.goto(`${FRONTEND_URL}/search`);

    await page.getByTestId("search-input").fill(questionTitle);
    await page.getByTestId("search-input").press("Enter");

    await expect(page.getByTestId("search-no-results")).toBeVisible({
      timeout: 10000,
    });
    await context.close();
  });

  // 6. Cleanup: admin deletes user A
  await test.step("Admin: delete user A", async () => {
    const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(FRONTEND_URL);
    await login(
      adminPage,
      ADMIN_CREDENTIALS.username,
      ADMIN_CREDENTIALS.password,
    );

    const adminToken = await getSessionToken(adminPage);

    await adminPage.request.delete(`${BACKEND_URL}/api/users/${userIdA}`, {
      headers: { "X-Session-Token": adminToken! },
    });

    await adminContext.close();
  });
});
