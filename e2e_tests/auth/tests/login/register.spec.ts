// register.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test('should register a new user and redirect to login page', async ({ page }) => {
  // Generate unique user credentials to avoid conflicts
  const timestamp = Date.now();
  const username = `testuser${timestamp}`;
  const email = `test${timestamp}@example.com`;
  const password = 'Test123!';

  // 1. Go to login page
  await page.goto(BASE_URL);

  // 2. Click the "Sign up" link
  const signUpLink = page.getByRole('link', { name: 'Sign up' });
  await signUpLink.click();

  // 3. Wait for registration page to load
  await expect(page).toHaveURL(`${BASE_URL}/register`);

  // 4. Fill the registration form
  await page.getByPlaceholder('Choose a username').fill(username);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  await page.getByPlaceholder('Confirm your password').fill(password);

  // 5. Submit the form
  const signUpButton = page.getByRole('button', { name: 'Sign Up' });
  await signUpButton.click();

  // 6. After successful registration, we should be redirected to login page
  await expect(page).toHaveURL(`${BASE_URL}/login`);

  // 7. Optionally, verify the login form is visible
  const loginHeading = page.getByRole('heading', { name: 'Welcome Back' });
  await expect(loginHeading).toBeVisible();
});