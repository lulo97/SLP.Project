import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  API_BASE_URL,
  ADMIN_USER,
  generateUser,
  registerUser,
  login,
  loginAsAdmin,
  deleteUser,
  createAuthenticatedPage,
} from './admin-helpers.js';

test.describe('Admin Users', () => {
  let adminToken;
  let testUserData;
  let createdUser;
  let userToken;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAsAdmin(request);
  });

  test.beforeEach(async ({ request }) => {
    // Create a fresh test user for each test
    testUserData = generateUser();
    createdUser = await registerUser(request, testUserData);
    userToken = await login(request, testUserData.username, testUserData.password);
  });

  test.afterEach(async ({ request }) => {
    // Clean up: delete the test user (cascades to their data)
    await deleteUser(request, adminToken, createdUser.id);
  });

  test('ban and unban user', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, adminToken);

    // Wait for users table to load
    await expect(page.locator(`text=${testUserData.username}`)).toBeVisible();

    // Click Ban button for the test user
    await page.click(`[data-testid="admin-user-ban-${createdUser.id}"]`);
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');

    // Wait for success message
    await expect(page.locator('.ant-message-success:has-text("User banned")')).toBeVisible();

    // Verify user cannot login via API (login endpoint should return 401)
    const loginAttempt = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: testUserData.username, password: testUserData.password },
    });
    expect(loginAttempt.status()).toBe(401);

    // Now unban the user
    // Note: after ban, the button changes to "Unban"
    await page.click(`[data-testid="admin-user-unban-${createdUser.id}"]`);
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');
    await expect(page.locator('.ant-message-success:has-text("User unbanned")')).toBeVisible();

    // Verify user can login again
    const loginAfter = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: testUserData.username, password: testUserData.password },
    });
    expect(loginAfter.status()).toBe(200);
  });

  test('search users', async ({ browser }) => {
    const page = await createAuthenticatedPage(browser, adminToken);

    // Wait for users table to load
    await expect(page.locator(`text=${testUserData.username}`)).toBeVisible();

    // Search by username
    await page.fill('[data-testid="admin-users-search"]', testUserData.username);
    await page.keyboard.press('Enter');

    // Should see only the test user
    await expect(page.locator(`text=${testUserData.username}`)).toBeVisible();
    // Optionally verify other users are not visible (might be flaky, skip or check count)
    const rows = await page.locator('.ant-table-row').count();
    expect(rows).toBe(1);
  });
});