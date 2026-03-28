// utils.ts
import { Page, BrowserContext } from '@playwright/test';

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------
export const FRONTEND_URL = 'http://localhost:3009';
export const BACKEND_URL = 'http://localhost:3008';

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '123',
};

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

/**
 * Perform login on the given page.
 * @param page Playwright page object
 * @param username username to fill
 * @param password password to fill
 */
export async function login(page: Page, username: string, password: string) {
  const usernameInput = page.getByPlaceholder('Enter your username');
  const passwordInput = page.getByPlaceholder('Enter your password');
  const signInButton = page.getByRole('button', { name: 'Sign In' });

  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await signInButton.click();
}

/**
 * Logout using the sidebar menu. This function assumes the sidebar is
 * initially closed (mobile viewport) and uses the toggle button to open it.
 * If the sidebar is already open, it will still work (the toggle will close
 * it, but the test will then try to open it again – we can improve this).
 * For simplicity, we keep the original logic: click toggle, wait for sidebar,
 * click logout.
 * @param page Playwright page object
 */
export async function logout(page: Page) {
  // Ensure mobile viewport to guarantee the sidebar toggle is needed
  await page.setViewportSize({ width: 375, height: 667 });

  const toggleButton = page.getByTestId('sidebar-toggle-button');
  await toggleButton.click();

  const sidebar = page.getByTestId('sidebar-container');
  await sidebar.waitFor({ state: 'visible' });

  const logoutItem = page.getByTestId('nav-item-logout');
  await logoutItem.click();
}

/**
 * Generate a unique set of user credentials.
 * @returns object containing unique username, email, and a fixed password
 */
export function generateUniqueUser() {
  const timestamp = Date.now();
  return {
    username: `testuser${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'Test123!',
  };
}

/**
 * Extract the session token from localStorage.
 * @param page Playwright page object
 * @returns session token string or null if not found
 */
export async function getSessionToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('session_token'));
}