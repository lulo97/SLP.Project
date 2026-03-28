import { test, expect } from '@playwright/test';
import { FRONTEND_URL, ADMIN_CREDENTIALS, login, logout } from './utils';

test('admin logs in, opens sidebar, logs out, and is redirected to login', async ({ page }) => {
  // 1. Login as admin
  await page.goto(FRONTEND_URL);
  await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
  await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

  // 2. Logout using the helper
  await logout(page);

  // 3. Expect navigation to login page and login form visible
  await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  const usernameInput = page.getByPlaceholder('Enter your username');
  await expect(usernameInput).toBeVisible();
});