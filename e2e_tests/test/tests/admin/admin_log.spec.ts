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

test.describe("Admin Log", () => {
  test("Admin logs a ban action and can find it in the logs tab", async ({
    page,
    browser,
  }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    // 1. Create a regular user (User A) via API
    const userA = generateUniqueUser();
    let userId: number;

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
      userId = body.id;
      expect(userId).toBeDefined();
      console.log(`Created user A: ${userA.username} (ID: ${userId})`);
    });

    // 2. Admin logs in via API to get a persistent token (avoids UI logout revoking it)
    let adminToken: string | null = null;

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
      console.log("Admin API token obtained.");
    });

    // 3. Admin bans user A via API
    await test.step("API: admin bans user A", async () => {
      const response = await request.post(
        `${BACKEND_URL}/api/admin/users/${userId}/ban`,
        { headers: { "X-Session-Token": adminToken! } }
      );
      expect(response.ok()).toBeTruthy();
      console.log(`Banned user A (ID: ${userId})`);
    });

    // 4. UI: Admin logs in, navigates to admin panel, and checks logs tab
    await test.step("UI: admin logs in and goes to logs tab", async () => {
      await page.goto(FRONTEND_URL);
      await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
      await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

      // Go to admin panel
      await page.goto(`${FRONTEND_URL}/admin`);
      await expect(page).toHaveURL(`${FRONTEND_URL}/admin`);

      // Wait for the admin tabs to be present and click the "Logs" tab
      const logsTab = page.getByTestId("admin-tab-logs");
      await logsTab.click();
      await expect(page.getByTestId("admin-logs-panel")).toBeVisible();
    });

    // 5. Apply filters to find the ban action log
    await test.step("UI: filter logs by action, target type, and target id", async () => {
      // Action dropdown: select "ban_user"
      const actionSelect = page.getByTestId("log-filter-action");
      await actionSelect.click();
      await page
        .getByTestId("log-filter-action-option-ban_user")
        .click();

      // Target type dropdown: select "user"
      const targetTypeSelect = page.getByTestId("log-filter-target-type");
      await targetTypeSelect.click();
      await page
        .getByTestId("log-filter-target-type-option-user")
        .click();

      // Free-text search: enter the user ID (target id)
      const searchInput = page.getByTestId("log-filter-search");
      await searchInput.fill(userId.toString());

      // Click Apply
      const applyButton = page.getByTestId("log-apply-filters");
      await applyButton.click();

      // Wait for the logs to load (loading spinner disappears or at least one card appears)
      await expect(page.getByTestId("admin-logs-panel")).toBeVisible();
      // Wait a moment for the API response and rendering
      await page.waitForTimeout(1000); // or wait for a specific card, but we'll count cards

      // Count the log cards inside the panel
      const logCards = page
        .locator('[data-testid="admin-logs-panel"] .mobile-card');
      const count = await logCards.count();

      // We expect at least one log entry (the ban action)
      expect(count).toBeGreaterThanOrEqual(1);
      console.log(`Found ${count} log entry(ies) matching the filters.`);
    });

    // 6. Clean up: Admin deletes user A via API
    await test.step("API: admin deletes user A", async () => {
      const response = await request.delete(
        `${BACKEND_URL}/api/users/${userId}`,
        { headers: { "X-Session-Token": adminToken! } }
      );
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.message).toContain("User deleted successfully");
      console.log(`Deleted user A (ID: ${userId})`);
    });

    // Optional: log out admin
    await test.step("UI: admin logs out", async () => {
      await logout(page);
      await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
    });

    await context.close();
  });
});