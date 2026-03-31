import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  login,
  generateUniqueUser,
  getSessionToken,
} from './utils';

test('UI Constraints: Duplicate validation and direct admin cleanup', async ({ page, browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const request = context.request;

  // Generate unique data
  const userA = generateUniqueUser();
  const userB = { ...generateUniqueUser(), username: userA.username }; // Same username as A
  const userC = { ...generateUniqueUser(), email: userA.email };       // Same email as A
  
  let userA_Id: number;

  // ---- Step 1: API registration for User A (Capture ID) ----
  await test.step('API: Register User A and save ID', async () => {
    const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: userA,
    });
    expect(response.ok()).toBeTruthy();
    const user = await response.json();
    userA_Id = user.id;
    expect(userA_Id).toBeDefined();
    console.log(`Created User A: ${userA.username} (ID: ${userA_Id})`);
  });

  // ---- Step 2: UI Register User B (Duplicate Username) ----
  await test.step('UI: Register User B - Should fail on Username', async () => {
    await page.goto(`${FRONTEND_URL}/register`);
    await page.getByTestId('input-username').fill(userB.username);
    await page.getByTestId('input-email').fill(userB.email);
    await page.getByTestId('input-password').fill(userB.password);
    await page.getByTestId('input-confirm-password').fill(userB.password);
    await page.getByTestId('button-submit').click();

    const errorAlert = page.getByTestId('error-alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Username already exists');
  });

  // ---- Step 3: UI Register User C (Duplicate Email) ----
  await test.step('UI: Register User C - Should fail on Email', async () => {
    await page.goto(`${FRONTEND_URL}/register`);
    await page.getByTestId('input-username').fill(userC.username);
    await page.getByTestId('input-email').fill(userC.email);
    await page.getByTestId('input-password').fill(userC.password);
    await page.getByTestId('input-confirm-password').fill(userC.password);
    await page.getByTestId('button-submit').click();

    const errorAlert = page.getByTestId('error-alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Email already exists');
  });

  // ---- Step 4: Admin Delete User A (Directly by ID) ----
  await test.step('Admin: Delete User A using captured ID', async () => {
    // 1. Get Admin Session Token
    await page.goto(FRONTEND_URL);
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    const adminToken = await getSessionToken(page);
    expect(adminToken).toBeTruthy();

    // 2. Direct API call to delete using userA_Id
    const deleteResponse = await request.delete(`${BACKEND_URL}/api/users/${userA_Id}`, {
      headers: {
        'X-Session-Token': adminToken!,
      },
    });

    expect(deleteResponse.ok()).toBeTruthy();
    const result = await deleteResponse.json();
    expect(result.message).toContain('User deleted successfully');
    console.log(`Successfully deleted User ID: ${userA_Id}`);
  });

  await context.close();
});