import { test, expect, Page } from '@playwright/test';

// ============================================================================
// CONFIGURATION – change these values to match your environment
// ============================================================================
const CONFIG = {
  // Base URL of your frontend application
  baseUrl: 'http://localhost:3002',

  // Admin credentials (must exist in the database)
  admin: {
    username: 'admin',
    password: '123',
  },

  // Route paths (relative to baseUrl)
  routes: {
    register: '/register',
    login: '/login',
    dashboard: '/dashboard',
    adminUsers: '/admin/users', // adjust if your admin panel uses a different path
  },

  // UI selectors and text – adjust if your app uses different labels
  ui: {
    // Sidebar toggle button (hamburger menu)
    sidebarToggle: 'button:has(svg.lucide-menu)', // targets the button containing the Menu icon

    register: {
      usernamePlaceholder: 'Choose a username',
      emailPlaceholder: 'Enter your email',
      passwordPlaceholder: 'Create a password',
      confirmPlaceholder: 'Confirm your password',
      signUpButton: 'Sign Up',
    },
    login: {
      usernamePlaceholder: 'Enter your username',
      passwordPlaceholder: 'Enter your password',
      signInButton: 'Sign In',
    },
    dashboard: {
      // The username appears as an exact match on the dashboard
      usernameText: (username: string) => username,
    },
    logout: {
      logoutButton: 'Logout',
    },
    admin: {
      searchPlaceholder: 'Search users...',
      searchButton: 'Search',
      deleteButton: 'Delete',
      confirmButton: 'Confirm',
      successMessage: 'User deleted successfully',
    },
    errors: {
      invalidCredentials: 'Invalid username or password',
    },
  },
};

// Apply the base URL for all page navigations
test.use({ baseURL: CONFIG.baseUrl });

// ============================================================================
// Helpers
// ============================================================================
function generateTestUser() {
  const timestamp = Date.now();
  const username = `testuser_${timestamp}`;
  const email = `${username}@example.com`;
  const password = 'Test123!';
  return { username, email, password };
}

async function logout(page: Page) {
  // Open the sidebar
  await page.locator(CONFIG.ui.sidebarToggle).click();
  // Click the logout button inside the sidebar
  await page.getByRole('button', { name: CONFIG.ui.logout.logoutButton }).click();
  // Wait for navigation to login page
  await expect(page).toHaveURL(CONFIG.routes.login);
}

// ============================================================================
// The test
// ============================================================================
test('Register new user → Login → Admin delete user (UI only)', async ({ page }) => {
  const { username, email, password } = generateTestUser();
  const { routes, ui, admin } = CONFIG;

  // ------------------------------------------------------------
  // 1. Register a new user via the UI
  // ------------------------------------------------------------
  await page.goto(routes.register);
  await page.getByPlaceholder(ui.register.usernamePlaceholder).fill(username);
  await page.getByPlaceholder(ui.register.emailPlaceholder).fill(email);
  await page.getByPlaceholder(ui.register.passwordPlaceholder).fill(password);
  await page.getByPlaceholder(ui.register.confirmPlaceholder).fill(password);
  await page.getByRole('button', { name: ui.register.signUpButton }).click();

  await expect(page).toHaveURL(routes.login);

  // ------------------------------------------------------------
  // 2. Login as the newly created user
  // ------------------------------------------------------------
  await page.getByPlaceholder(ui.login.usernamePlaceholder).fill(username);
  await page.getByPlaceholder(ui.login.passwordPlaceholder).fill(password);
  await page.getByRole('button', { name: ui.login.signInButton }).click();

  await expect(page).toHaveURL(routes.dashboard);
  // Verify the username is visible (exact match)
  await expect(page.getByText(ui.dashboard.usernameText(username), { exact: true })).toBeVisible();

  // ------------------------------------------------------------
  // 3. Log out (to prepare for admin login)
  // ------------------------------------------------------------
  await logout(page);

  // ------------------------------------------------------------
  // 4. Login as admin
  // ------------------------------------------------------------
  await page.getByPlaceholder(ui.login.usernamePlaceholder).fill(admin.username);
  await page.getByPlaceholder(ui.login.passwordPlaceholder).fill(admin.password);
  await page.getByRole('button', { name: ui.login.signInButton }).click();
  await expect(page).toHaveURL(routes.dashboard);

  // ------------------------------------------------------------
  // 5. Navigate to the admin user management page
  // ------------------------------------------------------------
  await page.goto(routes.adminUsers);
  await expect(page).toHaveURL(routes.adminUsers);

  // ------------------------------------------------------------
  // 6. Find and delete the newly created user
  // ------------------------------------------------------------
  // Search for the user
  await page.getByPlaceholder(ui.admin.searchPlaceholder).fill(username);
  await page.getByRole('button', { name: ui.admin.searchButton }).click();

  // Locate the user row (assumes a table with the username)
  const userRow = page.locator(`tr:has-text("${username}")`);

  // Click the delete button inside that row
  await userRow.locator('button', { hasText: ui.admin.deleteButton }).click();

  // Confirm deletion (if a modal appears)
  await page.getByRole('button', { name: ui.admin.confirmButton }).click();

  // Verify success message and that the user row disappears
  await expect(page.getByText(ui.admin.successMessage)).toBeVisible();
  await expect(userRow).toBeHidden();

  // ------------------------------------------------------------
  // 7. Verify that the deleted user can no longer log in
  // ------------------------------------------------------------
  // Log out admin
  await logout(page);

  // Attempt to log in as the deleted user
  await page.getByPlaceholder(ui.login.usernamePlaceholder).fill(username);
  await page.getByPlaceholder(ui.login.passwordPlaceholder).fill(password);
  await page.getByRole('button', { name: ui.login.signInButton }).click();

  // Should see an error message and remain on the login page
  await expect(page.getByText(ui.errors.invalidCredentials)).toBeVisible();
  await expect(page).toHaveURL(routes.login);
});