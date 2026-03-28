// register.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3009';

test('should register a new user and redirect to login page', async ({ page }) => {
  // Generate unique user credentials
  const timestamp = Date.now();
  const username = `testuser${timestamp}`;
  const email = `test${timestamp}@example.com`;
  const password = 'Test123!';

  // 1. Go to login page
  await page.goto(BASE_URL);

  // 2. Click the "Sign up" link (no data-testid on the link itself)
  await page.getByRole('link', { name: 'Sign up' }).click();

  // 3. Wait for registration page to load (optional, but good for reliability)
  await expect(page).toHaveURL(`${BASE_URL}/register`);

  // 4. Fill the registration form using data-testid selectors
  await page.getByTestId('input-username').fill(username);
  await page.getByTestId('input-email').fill(email);
  await page.getByTestId('input-password').fill(password);
  await page.getByTestId('input-confirm-password').fill(password);

  // 5. Submit the form
  await page.getByTestId('button-submit').click();

  // 6. After successful registration, we should be redirected to login page
  await expect(page).toHaveURL(`${BASE_URL}/login`);

  // 7. Optionally verify the login form is visible (using data-testid from login page if available, but not provided)
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});