import { test, expect } from '@playwright/test';
import { FRONTEND_URL, generateUniqueUser } from './utils';

test('should register a new user and redirect to login page', async ({ page }) => {
  const { username, email, password } = generateUniqueUser();

  // 1. Go to login page
  await page.goto(FRONTEND_URL);

  // 2. Click the "Sign up" link
  await page.getByRole('link', { name: 'Sign up' }).click();

  // 3. Wait for registration page to load
  await expect(page).toHaveURL(`${FRONTEND_URL}/register`);

  // 4. Fill the registration form
  await page.getByTestId('input-username').fill(username);
  await page.getByTestId('input-email').fill(email);
  await page.getByTestId('input-password').fill(password);
  await page.getByTestId('input-confirm-password').fill(password);

  // 5. Submit the form
  await page.getByTestId('button-submit').click();

  // 6. After successful registration, we should be redirected to login page
  await expect(page).toHaveURL(`${FRONTEND_URL}/login`);

  // 7. Optionally verify the login form is visible
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});