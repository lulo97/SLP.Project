// admin-logout.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3009';

test('admin logs in, opens sidebar, logs out, and is redirected to login', async ({ page }) => {
  // 1. Login as admin
  await page.goto(BASE_URL);

  const usernameInput = page.getByPlaceholder('Enter your username');
  const passwordInput = page.getByPlaceholder('Enter your password');
  const signInButton = page.getByRole('button', { name: 'Sign In' });

  await usernameInput.fill('admin');
  await passwordInput.fill('123');
  await signInButton.click();

  // 2. Wait for navigation to dashboard and verify we're logged in
  await expect(page).toHaveURL(`${BASE_URL}/dashboard`);

  // Optional: verify admin-specific element appears (e.g., Admin menu item)
  // But we'll first open sidebar to access logout

  // 3. Open the sidebar by clicking the menu toggle button
  const toggleButton = page.getByTestId('sidebar-toggle-button');
  await toggleButton.click();

  // 4. Wait for sidebar to be visible (it appears from the right)
  const sidebar = page.getByTestId('sidebar-container');
  await expect(sidebar).toBeVisible();

  // 5. Click the logout menu item
  const logoutItem = page.getByTestId('nav-item-logout');
  await logoutItem.click();

  // 6. Expect navigation to login page
  await expect(page).toHaveURL(`${BASE_URL}/login`);

  // Optionally verify login form is present again
  await expect(usernameInput).toBeVisible();
});