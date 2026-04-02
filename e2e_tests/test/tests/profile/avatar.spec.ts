// e2e_tests/test/tests/profile/avatar_upload.spec.ts
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  generateUniqueUser,
  getSessionToken,
  login,
  logout,
} from '../login/utils';

test('create user, upload avatar, verify img src, admin delete user', async ({ page, browser }) => {
  // 1. Ensure test image exists
  const iconPath = path.join(__dirname, 'icon128.png');
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Test file not found: ${iconPath}`);
  }

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const request = context.request;

  // 2. Create a new user via API
  const user = generateUniqueUser();
  user.password = 'Test123!';
  let userId: number;

  await test.step('API: register new user', async () => {
    const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: user,
    });
    expect(response.ok()).toBeTruthy();
    const userData = await response.json();
    userId = userData.id;
    expect(userId).toBeDefined();
    console.log(`Created user: ${user.username} (ID: ${userId})`);
  });

  // 3. UI login as the new user
  await test.step('UI: login as new user', async () => {
    await page.goto(FRONTEND_URL);
    await login(page, user.username, user.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  // 4. Upload avatar
  await test.step('UI: upload avatar', async () => {
    await page.goto(`${FRONTEND_URL}/profile`);
    await expect(page.getByTestId('profile-container')).toBeVisible();

    // Set the hidden file input
    const fileInput = page.getByTestId('avatar-file-input');
    await fileInput.setInputFiles(iconPath);

    // Wait for success message
    await expect(page.getByText('Avatar updated!')).toBeVisible({ timeout: 5000 });
  });

  // 5. Verify <img> contains a src attribute
  await test.step('Verify avatar image src', async () => {
    const avatarImg = page.getByTestId('profile-avatar-img');
    await expect(avatarImg).toBeVisible();
    const src = await avatarImg.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).not.toBe('');
    console.log(`Avatar src: ${src}`);
  });

  // 6. Logout user
  await test.step('UI: logout user', async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // 7. Admin deletes the user via API
  let adminToken: string | null = null;
  await test.step('UI: login as admin to obtain session token', async () => {
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
    adminToken = await getSessionToken(page);
    expect(adminToken).toBeTruthy();
  });

  await test.step('API: admin deletes user', async () => {
    const deleteResponse = await request.delete(`${BACKEND_URL}/api/users/${userId}`, {
      headers: { 'X-Session-Token': adminToken! },
    });
    expect(deleteResponse.ok()).toBeTruthy();
    const result = await deleteResponse.json();
    expect(result.message).toContain('User deleted successfully');
    console.log(`Admin deleted user ID: ${userId}`);
  });

  // 8. Verify deletion: deleted user cannot log in
  await test.step('UI: verify deleted user cannot login', async () => {
    await logout(page);
    await login(page, user.username, user.password);
    await expect(page.getByText(/Invalid username or password/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
    console.log('Deleted user cannot login – correct');
  });

  await context.close();
});