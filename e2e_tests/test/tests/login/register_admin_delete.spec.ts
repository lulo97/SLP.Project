import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  login,
  logout,
  generateUniqueUser,
  getSessionToken,
} from './utils';

test('register user, login, logout, admin deletes user, verify user cannot login', async ({ page, browser }) => {
  // Create a new browser context with ignoreHTTPSErrors for API requests
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const request = context.request;

  const { username, email, password } = generateUniqueUser();
  let userId: number;

  // ---- Step 1: API registration (capture user ID) ----
  await test.step('API: register new user', async () => {
    const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: { username, email, password },
    });
    expect(response.ok()).toBeTruthy();
    const user = await response.json();
    userId = user.id;
    expect(userId).toBeDefined();
    console.log(`Created user: ${username} with ID: ${userId}`);
  });

  // ---- Step 2: UI login as new user ----
  await test.step('UI: login as new user', async () => {
    await page.goto(FRONTEND_URL);
    await login(page, username, password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  // ---- Step 3: UI logout (new user) ----
  await test.step('UI: logout', async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 4: UI login as admin and capture session token ----
  let adminToken: string | null = null;
  await test.step('UI: login as admin', async () => {
    await page.goto(FRONTEND_URL);
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    adminToken = await getSessionToken(page);
    expect(adminToken).toBeTruthy();
  });

  // ---- Step 5: API call to delete user (using X-Session-Token header) ----
  await test.step('API: delete user', async () => {
    const deleteResponse = await request.delete(`${BACKEND_URL}/api/users/${userId}`, {
      headers: {
        'X-Session-Token': adminToken!,
      },
    });
    expect(deleteResponse.ok()).toBeTruthy();
    const deleteResult = await deleteResponse.json();
    expect(deleteResult.message).toContain('User deleted successfully');
    console.log(`Deleted user with ID: ${userId}`);
  });

  // ---- Step 6: UI logout admin ----
  await test.step('UI: logout admin', async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 7: Try to login as deleted user – should fail ----
  await test.step('UI: attempt login as deleted user', async () => {
    await login(page, username, password);
    await expect(page.getByText('Invalid username or password')).toBeVisible();
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // Clean up
  await context.close();
});