import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  login,
  logout,
  generateUniqueUser,
  getSessionToken,
} from '../login/utils';

test('register user A, admin bans them, user A login fails, admin unbans, user A login succeeds, admin deletes user', async ({
  page,
  browser,
}) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const request = context.request;

  const { username, email, password } = generateUniqueUser();
  let userId: number;
  let adminToken: string | null = null;

  // ---- Step 1: API – Register user A ----
  await test.step('API: register user A', async () => {
    const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: { username, email, password },
    });
    expect(response.ok()).toBeTruthy();
    const user = await response.json();
    userId = user.id;
    expect(userId).toBeDefined();
    console.log(`Created user: ${username} with ID: ${userId}`);
  });

  // ---- Step 2: UI – Login as admin ----
  await test.step('UI: login as admin (first time)', async () => {
    await page.goto(FRONTEND_URL);
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    adminToken = await getSessionToken(page);
    expect(adminToken).toBeTruthy();
  });

  // ---- Step 3: API – Admin bans user A ----
  await test.step('API: admin bans user A', async () => {
    const response = await request.post(`${BACKEND_URL}/api/admin/users/${userId}/ban`, {
      headers: { 'X-Session-Token': adminToken! },
    });
    expect(response.ok()).toBeTruthy();
    console.log(`Banned user ID: ${userId}`);
  });

  // ---- Step 4: UI – Admin logs out ----
  await test.step('UI: admin logs out', async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 5: UI – User A tries to login and fails ----
  await test.step('UI: user A login fails while banned', async () => {
    await page.goto(FRONTEND_URL);
    await login(page, username, password);

    // Banned users should see a banned-specific message from the backend
    // The LoginPage handles ACCOUNT_BANNED code with message.error()
    await expect(
      page.getByText(/banned/i).first()
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
    console.log('User A correctly blocked from logging in while banned.');
  });

  // ---- Step 6: UI – Admin logs back in ----
  await test.step('UI: login as admin (second time)', async () => {
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    adminToken = await getSessionToken(page);
    expect(adminToken).toBeTruthy();
  });

  // ---- Step 7: API – Admin unbans user A ----
  await test.step('API: admin unbans user A', async () => {
    const response = await request.post(`${BACKEND_URL}/api/admin/users/${userId}/unban`, {
      headers: { 'X-Session-Token': adminToken! },
    });
    expect(response.ok()).toBeTruthy();
    console.log(`Unbanned user ID: ${userId}`);
  });

  // ---- Step 8: UI – Admin logs out ----
  await test.step('UI: admin logs out (second time)', async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 9: UI – User A logs in successfully after unban ----
  await test.step('UI: user A login succeeds after unban', async () => {
    await page.goto(FRONTEND_URL);
    await login(page, username, password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
    console.log('User A logged in successfully after unban.');
  });

  // ---- Step 10: UI – User A logs out ----
  await test.step('UI: user A logs out', async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 11: UI – Admin logs in for cleanup ----
  await test.step('UI: login as admin (final time)', async () => {
    await page.goto(FRONTEND_URL);
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    adminToken = await getSessionToken(page);
    expect(adminToken).toBeTruthy();
  });

  // ---- Step 12: API – Admin deletes user A ----
  await test.step('API: admin deletes user A', async () => {
    const response = await request.delete(`${BACKEND_URL}/api/users/${userId}`, {
      headers: { 'X-Session-Token': adminToken! },
    });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.message).toContain('User deleted successfully');
    console.log(`Deleted user ID: ${userId}`);
  });

  // ---- Step 13: UI – Admin logs out ----
  await test.step('UI: admin logs out (cleanup)', async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // Clean up
  await context.close();
});