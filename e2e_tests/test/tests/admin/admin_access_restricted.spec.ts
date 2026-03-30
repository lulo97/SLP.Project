// D:\SLP.Project\e2e_tests\test\tests\admin\admin_access_restricted.spec.ts
import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  generateUniqueUser,
  login,
} from "../login/utils";

test.describe("Admin Access Restriction", () => {
  let regularUser: { username: string; email: string; password: string };
  let userId: number;

  test.beforeAll(async ({ browser }) => {
    // Create a new browser context for API calls
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    // Register a regular user via API
    regularUser = generateUniqueUser();
    const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        username: regularUser.username,
        email: regularUser.email,
        password: regularUser.password,
      },
    });
    expect(response.ok()).toBeTruthy();
    const user = await response.json();
    userId = user.id;
    console.log(
      `Created regular user: ${regularUser.username} (ID: ${userId})`,
    );

    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    // Clean up: delete the regular user using admin API call
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    // Login as admin via API to obtain session token
    const loginResponse = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: {
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password,
      },
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      const adminToken = loginData.token;

      // Delete the user
      const deleteResponse = await request.delete(
        `${BACKEND_URL}/api/users/${userId}`,
        {
          headers: {
            "X-Session-Token": adminToken,
          },
        },
      );
      if (deleteResponse.ok()) {
        console.log(`Deleted user with ID: ${userId}`);
      } else {
        console.warn(
          `Failed to delete user ${userId}: ${await deleteResponse.text()}`,
        );
      }
    } else {
      console.warn("Admin login failed, cannot clean up user");
    }

    await context.close();
  });

  test("Regular user cannot access admin pages and is redirected to dashboard", async ({
    page,
  }) => {
    // 1. Log in as regular user
    await page.goto(FRONTEND_URL);
    await login(page, regularUser.username, regularUser.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // 2. Try to navigate to main admin panel (/admin)
    await page.goto(`${FRONTEND_URL}/admin`);
    // Expect redirect to dashboard
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // 3. Try /admin/health
    await page.goto(`${FRONTEND_URL}/admin/health`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // 4. Try /admin/metrics
    await page.goto(`${FRONTEND_URL}/admin/metrics`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });
});
