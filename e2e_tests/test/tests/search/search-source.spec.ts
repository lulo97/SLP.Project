import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  login,
  generateUniqueUser,
  getSessionToken,
} from "../login/utils";

test("user creates a source, searches for it, deletes it, admin deletes user", async ({
  browser,
}) => {
  test.setTimeout(180000);

  // 1. Create user via API
  const user = generateUniqueUser();
  let userId: number;

  await test.step("API: register user", async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    const resp = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: user,
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    userId = data.id;

    await context.close();
  });

  // 2. User creates a text source (note)
  const sourceTitle = `Test Source ${Date.now()}`;
  const sourceContent = `This is the content of the test source. It contains a unique phrase: ${sourceTitle}`;

  await test.step("User: create text source", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);

    // Go to sources list and click "Add Text"
    await page.goto(`${FRONTEND_URL}/source`);
    await page.getByTestId("source-list-add-text-btn").click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-text`);

    // Fill the form
    await page.getByTestId("source-text-create-title-input").fill(sourceTitle);
    await page
      .getByTestId("source-text-create-content-input")
      .fill(sourceContent);
    await page.getByTestId("source-text-create-submit-btn").click();

    // Wait for source detail page and capture ID
    await page.waitForURL(/\/source\/\d+/);
    const urlMatch = page.url().match(/\/source\/(\d+)/);
    expect(urlMatch).toBeTruthy();
    const sourceId = urlMatch![1];

    // Optional: verify the source appears in the list (implicitly via later search)
    await context.close();
  });

  // 3. User searches for the source
  await test.step("User: search for own source", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);

    await page.goto(`${FRONTEND_URL}/search`);
    await page.getByTestId("search-input").fill(sourceTitle);
    await page.getByTestId("search-input").press("Enter");

    // Wait for result to appear (All tab)
    const resultLocator = page.locator(
      `[data-testid^="search-result-item-"]:has-text("${sourceTitle}")`,
    );
    await expect(resultLocator).toBeVisible({ timeout: 15000 });

    // Switch to Sources tab and verify
    const sourcesTab = page.getByTestId("search-tab-source");
    await sourcesTab.click();
    await expect(resultLocator).toBeVisible();

    await context.close();
  });

  // 4. User deletes the source
  await test.step("User: delete the source", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);
    await page.goto(`${FRONTEND_URL}/source`);

    // Search for the source by title (simple filter in the list)
    const searchInput = page.getByTestId("source-list-search-input");
    await searchInput.fill(sourceTitle);
    await searchInput.press("Enter");

    // Find the source item and delete it
    const sourceItem = page.locator(
      `[data-testid^="source-list-item-"]:has-text("${sourceTitle}")`,
    );
    await expect(sourceItem.first()).toBeVisible();

    const deleteBtn = sourceItem.locator('[data-testid^="source-list-delete-btn-"]');
    await deleteBtn.click();
    await page.getByRole("button", { name: "Yes" }).click();

    // Wait for deletion
    await expect(sourceItem).not.toBeVisible();

    await context.close();
  });

  // 5. User verifies the source is gone from search
  await test.step("User: verify source is removed from search", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);
    await page.goto(`${FRONTEND_URL}/search`);

    await page.getByTestId("search-input").fill(sourceTitle);
    await page.getByTestId("search-input").press("Enter");

    await expect(page.getByTestId("search-no-results")).toBeVisible({
      timeout: 10000,
    });

    await context.close();
  });

  // 6. Cleanup: admin deletes user
  await test.step("Admin: delete user", async () => {
    const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(FRONTEND_URL);
    await login(
      adminPage,
      ADMIN_CREDENTIALS.username,
      ADMIN_CREDENTIALS.password,
    );

    const adminToken = await getSessionToken(adminPage);

    await adminPage.request.delete(`${BACKEND_URL}/api/users/${userId}`, {
      headers: { "X-Session-Token": adminToken! },
    });

    await adminContext.close();
  });
});