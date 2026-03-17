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
    testUserData = generateUser();
    createdUser = await registerUser(request, testUserData);
    userToken = await login(request, testUserData.username, testUserData.password);
  });

  test.afterEach(async ({ request }) => {
    await deleteUser(request, adminToken, createdUser.id);
  });

  test('ban and unban user', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, adminToken);

    // Search for the test user
    await page.fill('[data-testid="admin-users-search"]', testUserData.username);
    await page.keyboard.press('Enter');

    // Wait for the user row to appear – use exact match to avoid matching email
    await expect(page.getByText(testUserData.username, { exact: true })).toBeVisible();

    // Click Ban button for the test user
    await page.click(`[data-testid="admin-user-ban-${createdUser.id}"]`);
    await page.click('.ant-popconfirm-buttons .ant-btn-primary');

    // Wait for success message
    await expect(page.locator('.ant-message-success:has-text("User banned")')).toBeVisible();

    // Verify user cannot login via API
    const loginAttempt = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: testUserData.username, password: testUserData.password },
    });
    expect(loginAttempt.status()).toBe(401);

    // Now unban the user – the button should now be "Unban"
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

    // Search by username
    await page.fill('[data-testid="admin-users-search"]', testUserData.username);
    await page.keyboard.press('Enter');

    // Should see only the test user – use exact match for username
    await expect(page.getByText(testUserData.username, { exact: true })).toBeVisible();

    // Count rows containing the username in any form (should be 1)
    const rows = await page.locator('.ant-table-row').count();
    expect(rows).toBe(1);
  });
});