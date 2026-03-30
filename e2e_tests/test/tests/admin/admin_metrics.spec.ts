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

test.describe("Admin Metrics", () => {
  // Helper: sum metrics from an API response
  const sumMetricPoints = (points: { value: number }[]) =>
    points.reduce((sum, p) => sum + p.value, 0);

  // Helper: get total requests from last N minutes
  const getTotalRequests = async (request: any, adminToken: string, minutes = 5) => {
    const to = new Date();
    const from = new Date(to.getTime() - minutes * 60 * 1000);
    const resp = await request.get(`${BACKEND_URL}/api/admin/metrics/requests`, {
      params: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      headers: { "X-Session-Token": adminToken },
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    return sumMetricPoints(data);
  };

  // Helper: get total errors from last N minutes
  const getTotalErrors = async (request: any, adminToken: string, minutes = 5) => {
    const to = new Date();
    const from = new Date(to.getTime() - minutes * 60 * 1000);
    const resp = await request.get(`${BACKEND_URL}/api/admin/metrics/errors`, {
      params: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      headers: { "X-Session-Token": adminToken },
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    return sumMetricPoints(data);
  };

  // Wait for the next minute boundary to allow metrics flush
  const waitForNextMinute = async () => {
    const now = new Date();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();
    const delay = (60 - seconds) * 1000 - milliseconds + 500; // add 500ms buffer
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
  };

  test("UI components are present (skip backend)", async ({ page }) => {
    // Login as admin
    await page.goto(FRONTEND_URL);
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Navigate to metrics page
    await page.goto(`${FRONTEND_URL}/admin/metrics`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin/metrics`);

    // Check presence of key UI elements
    await expect(page.getByTestId("metrics-time-range-card")).toBeVisible();
    await expect(page.getByTestId("preset-last-1h")).toBeVisible();
    await expect(page.getByTestId("preset-last-6h")).toBeVisible();
    await expect(page.getByTestId("preset-last-24h")).toBeVisible();
    await expect(page.getByTestId("metrics-range-picker")).toBeVisible();
    await expect(page.getByTestId("metrics-refresh-button")).toBeVisible();

    // Check that summary stats cards are present (even if loading/empty)
    await expect(page.getByTestId("stat-card-total-requests")).toBeVisible();
    await expect(page.getByTestId("stat-card-total-errors")).toBeVisible();
    await expect(page.getByTestId("stat-card-avg-latency")).toBeVisible();
    await expect(page.getByTestId("stat-card-p95-latency")).toBeVisible();

    // Check that chart cards are present
    await expect(page.getByTestId("chart-card-requests")).toBeVisible();
    await expect(page.getByTestId("chart-card-errors")).toBeVisible();
    await expect(page.getByTestId("chart-card-latency")).toBeVisible();

    // Optionally, verify that the page is not broken (no crash)
    const title = await page.title();
    expect(title).toContain("API Metrics"); // or whatever the page title is
  });

  test("Total requests increase after user login/logout actions", async ({
    page,
    browser,
  }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    // Admin login via API to get a token
    const adminLogin = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: {
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password,
      },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminToken = (await adminLogin.json()).token;
    expect(adminToken).toBeTruthy();

    // Register a regular user
    const regularUser = generateUniqueUser();
    const registerResp = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        username: regularUser.username,
        email: regularUser.email,
        password: regularUser.password,
      },
    });
    expect(registerResp.ok()).toBeTruthy();

    // Get initial total requests (last 5 minutes)
    const initialRequests = await getTotalRequests(request, adminToken, 5);
    console.log(`Initial total requests: ${initialRequests}`);

    // Perform UI actions that generate requests (login/logout)
    // Use a new page for the regular user to avoid interfering with admin session
    const userPage = await context.newPage();
    await userPage.goto(FRONTEND_URL);
    await login(userPage, regularUser.username, regularUser.password);
    await expect(userPage).toHaveURL(`${FRONTEND_URL}/dashboard`);
    await logout(userPage);
    await expect(userPage).toHaveURL(`${FRONTEND_URL}/login`);

    // Wait for metrics flush to occur (next minute boundary)
    await waitForNextMinute();

    // Get new total requests
    const newRequests = await getTotalRequests(request, adminToken, 5);
    console.log(`New total requests: ${newRequests}`);

    // Assert that requests increased (at least by the number of actions we performed)
    // Our actions: login page load, login POST, dashboard load, logout POST, login page redirect
    // That's at least 5 requests, but we just check increase > 0
    expect(newRequests).toBeGreaterThan(initialRequests);

    // Clean up: delete the regular user via API
    const deleteResp = await request.delete(`${BACKEND_URL}/api/users/${registerResp.json().id}`, {
      headers: { "X-Session-Token": adminToken },
    });
    expect(deleteResp.ok()).toBeTruthy();

    await context.close();
  });

  test("Error metric increases when hitting always-error endpoint", async ({
    browser,
  }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const request = context.request;

    // Admin login via API to get a token (needed for metrics endpoints)
    const adminLogin = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: {
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password,
      },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminToken = (await adminLogin.json()).token;
    expect(adminToken).toBeTruthy();

    // Get initial errors count
    const initialErrors = await getTotalErrors(request, adminToken, 5);
    console.log(`Initial errors: ${initialErrors}`);

    // Hit a non-existent endpoint multiple times to generate 404 errors
    const errorEndpoint = `${BACKEND_URL}/api/always-error-${Date.now()}`;
    const errorCount = 5;
    for (let i = 0; i < errorCount; i++) {
      const resp = await request.get(errorEndpoint);
      expect(resp.status()).toBe(404);
    }

    // Wait for metrics flush
    await waitForNextMinute();

    // Get new errors count
    const newErrors = await getTotalErrors(request, adminToken, 5);
    console.log(`New errors: ${newErrors}`);

    // Assert that errors increased by at least the number of error requests
    expect(newErrors).toBeGreaterThanOrEqual(initialErrors + errorCount);

    await context.close();
  });
});