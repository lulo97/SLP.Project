import { test, expect } from '@playwright/test';
import { FRONTEND_URL } from './utils';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
  });

  test('should fill username and password fields', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('Enter your username');
    const passwordInput = page.getByPlaceholder('Enter your password');

    await usernameInput.fill('testuser');
    await passwordInput.fill('password123');

    await expect(usernameInput).toHaveValue('testuser');
    await expect(passwordInput).toHaveValue('password123');
  });

  test('should show validation errors correctly', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('Enter your username');
    const passwordInput = page.getByPlaceholder('Enter your password');
    const signInButton = page.getByRole('button', { name: 'Sign In' });

    // Both fields empty
    await signInButton.click();
    await expect(page.getByText('Username is required')).toBeVisible();
    await expect(page.getByText('Password is required')).not.toBeVisible();

    // Only username filled
    await usernameInput.fill('testuser');
    await signInButton.click();
    await expect(page.getByText('Username is required')).not.toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });
});