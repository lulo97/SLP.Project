// e2e_tests/auth/tests/login/register_admin_delete.spec.ts
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:4000';
const BACKEND_URL = 'https://localhost:7297'; // use HTTPS directly to avoid redirects
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '123';

test('register user, login, logout, admin deletes user, verify user cannot login', async ({ page, browser }) => {
  // Create a new browser context with ignoreHTTPSErrors for API requests
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const request = context.request;

  const timestamp = Date.now();
  const username = `testuser${timestamp}`;
  const email = `test${timestamp}@example.com`;
  const password = 'Test123!';

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
    const usernameInput = page.getByPlaceholder('Enter your username');
    const passwordInput = page.getByPlaceholder('Enter your password');
    const signInButton = page.getByRole('button', { name: 'Sign In' });

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await signInButton.click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  // ---- Step 3: UI logout ----
  await test.step('UI: logout', async () => {
    // Use mobile viewport to trigger sidebar toggle
    await page.setViewportSize({ width: 375, height: 667 });
    const toggleButton = page.getByTestId('sidebar-toggle-button');
    await toggleButton.click();

    const sidebar = page.getByTestId('sidebar-container');
    await expect(sidebar).toBeVisible();

    const logoutItem = page.getByTestId('nav-item-logout');
    await logoutItem.click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 4: UI login as admin and capture session token ----
  let adminToken: string | null = null;
  await test.step('UI: login as admin', async () => {
    const usernameInput = page.getByPlaceholder('Enter your username');
    const passwordInput = page.getByPlaceholder('Enter your password');
    const signInButton = page.getByRole('button', { name: 'Sign In' });

    await usernameInput.fill(ADMIN_USERNAME);
    await passwordInput.fill(ADMIN_PASSWORD);
    await signInButton.click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // Extract session token from localStorage
    adminToken = await page.evaluate(() => localStorage.getItem('session_token'));
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
    // Ensure sidebar is open (it may be closed after page reloads)
    const toggleButton = page.getByTestId('sidebar-toggle-button');
    await toggleButton.click(); // open
    await page.waitForTimeout(500);
    const logoutItem = page.getByTestId('nav-item-logout');
    await logoutItem.click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 7: Try to login as deleted user – should fail ----
  await test.step('UI: attempt login as deleted user', async () => {
    const usernameInput = page.getByPlaceholder('Enter your username');
    const passwordInput = page.getByPlaceholder('Enter your password');
    const signInButton = page.getByRole('button', { name: 'Sign In' });

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await signInButton.click();

    // Expect the error message (as per LoginPage.vue)
    await expect(page.getByText('Invalid username or password')).toBeVisible();
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // Clean up
  await context.close();
});