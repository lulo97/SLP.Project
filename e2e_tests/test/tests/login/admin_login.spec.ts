import { test, expect } from '@playwright/test';
import { FRONTEND_URL, ADMIN_CREDENTIALS, login } from './utils';

test('admin login with admin/123 should navigate to /dashboard', async ({ page }) => {
  await page.goto(FRONTEND_URL);
  await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
  await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
});