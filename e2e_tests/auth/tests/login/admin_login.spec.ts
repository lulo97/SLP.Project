// admin-login.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test('admin login with admin/123 should navigate to /dashboard', async ({ page }) => {
  await page.goto(BASE_URL);

  const usernameInput = page.getByPlaceholder('Enter your username');
  const passwordInput = page.getByPlaceholder('Enter your password');
  const signInButton = page.getByRole('button', { name: 'Sign In' });

  await usernameInput.fill('admin');
  await passwordInput.fill('123');
  await signInButton.click();

  await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
});