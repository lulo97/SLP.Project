# E2E Test Documentation – Authentication Module

## 1. Introduction

This document provides a detailed overview of the end‑to‑end (E2E) tests implemented for the authentication module of the SLP project. The tests are written using **Playwright** and cover key user flows: login, logout, registration, form validation, and administrative user management (including deletion). All tests interact with a running frontend (`http://localhost:4000`) and, where necessary, with the backend API (`https://localhost:7297`).

The goal of these tests is to ensure the correctness, stability, and security of the authentication process from a user’s perspective.

## 2. Test Files Overview

The test suite consists of five Playwright test files located under `D:\SLP.Project\e2e_tests\auth\tests\login\`:

| File Name | Description |
|-----------|-------------|
| `admin_login.spec.ts` | Verifies that an admin user can log in with valid credentials and is redirected to the dashboard. |
| `admin_logout.spec.ts` | Checks the full logout flow: admin logs in, opens the sidebar, clicks logout, and is redirected to the login page. |
| `fill_fields.spec.ts` | Tests the login page’s field filling and validation error messages (empty fields, partial input). |
| `register.spec.ts` | Tests the user registration flow: navigating to the registration page, filling the form with unique credentials, and being redirected to the login page. |
| `register_admin_delete.spec.ts` | End‑to‑end scenario: a new user registers (via API), logs in, logs out; an admin logs in, deletes the user via API; then the deleted user cannot log in. This test combines UI and API interactions. |

All tests assume that the frontend and backend services are running locally with the specified URLs.

## 3. Detailed Test Descriptions

### 3.1 `admin_login.spec.ts` – Admin Login

**Purpose:** Validate that the admin user can successfully authenticate and reach the dashboard.

**Steps:**
1. Navigate to the frontend base URL (`http://localhost:4000`).
2. Locate the username and password input fields using their placeholder texts.
3. Fill in `admin` and `123`.
4. Click the "Sign In" button.
5. Wait for the URL to change to `/dashboard`.

**Assertions:**
- The browser URL becomes `http://localhost:4000/dashboard`.

**Potential Issues / Observations:**
- No explicit check for the presence of dashboard‑specific elements (e.g., welcome message, admin menu) – only URL verification is performed. This is acceptable for a basic login test, but adding an element check could increase reliability.
- Hardcoded credentials are used; consider using environment variables for better maintainability.

---

### 3.2 `admin_logout.spec.ts` – Admin Logout

**Purpose:** Test the complete logout flow from login to successful redirection to the login page.

**Steps:**
1. Login as admin using the same credentials as in `admin_login.spec.ts`.
2. Wait for the dashboard URL to appear.
3. Click the sidebar toggle button (located via `data-testid="sidebar-toggle-button"`).
4. Wait for the sidebar to be visible (using `data-testid="sidebar-container"`).
5. Click the logout menu item (`data-testid="nav-item-logout"`).
6. Verify redirection to `/login` and that the login form fields are again visible.

**Assertions:**
- After login: URL is `/dashboard`.
- Sidebar becomes visible after toggle.
- After logout: URL is `/login` and the username input field is visible.

**Potential Issues / Observations:**
- The test assumes the sidebar is initially closed and the toggle button opens it. This is consistent with the mobile viewport, but the test does not set a viewport size; it relies on the default size (which might show the sidebar already open). It is safer to explicitly set a mobile viewport to ensure the toggle is needed.
- No verification that the session token is removed (e.g., checking local storage). This could be added for security verification.

---

### 3.3 `fill_fields.spec.ts` – Login Page Validation

**Purpose:** Ensure that the login form correctly handles field input and displays appropriate validation error messages.

**Setup:**
- A `beforeEach` hook navigates to the base URL for each test.

**Tests:**
1. **Fill fields:**
   - Fill the username and password fields.
   - Verify that the inputs contain the filled values.

2. **Validation errors:**
   - **Both fields empty:** Click "Sign In" → expect only "Username is required" error, not "Password is required".
   - **Only username filled:** Fill username, click "Sign In" → expect "Password is required" error, and the username error disappears.

**Assertions:**
- Input values are correctly set.
- Error messages appear as expected based on the validation rules.

**Potential Issues / Observations:**
- The test assumes that the validation error messages are exactly "Username is required" and "Password is required". If the texts change, the test will fail.
- The validation logic shown (only one error at a time) might be intentional (e.g., field‑by‑field validation). The test covers the current behavior.

---

### 3.4 `register.spec.ts` – User Registration

**Purpose:** Test the registration process: navigating to the registration form, submitting new user data, and being redirected to the login page.

**Steps:**
1. Go to the login page (`http://localhost:4000`).
2. Click the "Sign up" link (using role‑based selector).
3. Wait for the URL to become `/register`.
4. Fill the registration form using `data-testid` attributes:
   - `input-username`
   - `input-email`
   - `input-password`
   - `input-confirm-password`
5. Click the submit button (`data-testid="button-submit"`).
6. Verify redirection to `/login` and that the "Welcome Back" heading is visible.

**Assertions:**
- After registration, the page URL is `/login`.
- The heading "Welcome Back" is present on the login page.

**Potential Issues / Observations:**
- The test uses a timestamp to generate unique credentials, avoiding conflicts.
- It relies on `data-testid` attributes for the registration form fields – good practice for stable selectors.
- The test does not verify that the new user can actually log in; that is covered in `register_admin_delete.spec.ts`.
- The "Welcome Back" heading may not be unique; a more specific check (e.g., presence of the login form) would be better.

---

### 3.5 `register_admin_delete.spec.ts` – Admin Deletes User

**Purpose:** End‑to‑end scenario covering user registration, admin‑mediated deletion, and verification that the deleted user can no longer log in. This test mixes UI actions with API calls to simulate administrative tasks.

**Setup:**
- A new browser context is created with `ignoreHTTPSErrors: true` to allow HTTPS API calls to the local backend.
- A timestamp is appended to the username, email to ensure uniqueness.
- A `userId` variable is captured from the registration API response.

**Steps (as test steps):**
1. **API registration:**
   - POST to `https://localhost:7297/api/auth/register` with unique username, email, password.
   - Verify success (200 OK) and extract `user.id` from the response.
2. **UI login as new user:**
   - Navigate to the frontend, fill credentials, click Sign In.
   - Verify redirection to `/dashboard`.
3. **UI logout:**
   - Set viewport to mobile size (375x667) to ensure the sidebar is toggled.
   - Click sidebar toggle button, wait for sidebar to appear, click logout item.
   - Verify redirection to `/login`.
4. **UI login as admin:**
   - Fill admin credentials, click Sign In, verify dashboard URL.
   - Extract the session token from `localStorage.getItem('session_token')`.
5. **API delete user:**
   - DELETE request to `https://localhost:7297/api/users/${userId}` with header `X-Session-Token: adminToken`.
   - Verify success and a message containing "User deleted successfully".
6. **UI logout admin:**
   - Open sidebar (if needed) and click logout; verify redirection to `/login`.
7. **UI attempt login as deleted user:**
   - Fill the original user’s credentials, click Sign In.
   - Verify that the error message "Invalid username or password" is visible and the URL remains `/login`.

**Cleanup:**
- The browser context is closed.

**Assertions:**
- API registration returns a user ID.
- New user can log in and reach dashboard.
- New user can log out.
- Admin can log in and obtain a session token.
- Admin can delete the user via API.
- Admin can log out.
- Deleted user cannot log in (error message appears).

**Potential Issues / Observations:**
- The test uses `ignoreHTTPSErrors: true` – acceptable for local development but should be reconsidered for CI environments where valid certificates might be used.
- The test extracts the session token from `localStorage` – this assumes the frontend stores it there. If storage mechanism changes, the test will break.
- The admin logout step clicks the toggle button again; this may be unnecessary if the sidebar was already open. A check for sidebar visibility before clicking could improve robustness.
- The test does not verify that the deleted user cannot log in using the API; it only checks UI. This is sufficient for E2E coverage.
- This test relies heavily on API endpoints; any change in the API contract (e.g., response structure) will require updating the test.

---

## 4. Test Coverage Summary

| Feature                | Covered by Tests                                      |
|------------------------|-------------------------------------------------------|
| Admin login            | `admin_login.spec.ts`                                 |
| Admin logout           | `admin_logout.spec.ts`                                |
| Login form validation  | `fill_fields.spec.ts`                                 |
| User registration      | `register.spec.ts`                                    |
| Admin deletion of user | `register_admin_delete.spec.ts` (API)                 |
| End‑to‑end flow        | `register_admin_delete.spec.ts` (API + UI)            |

**Missing Coverage:**
- **Password reset / forgot password** – not covered.
- **Session expiry / token refresh** – not tested.
- **Concurrent sessions or multiple browser tabs** – not covered.
- **Edge cases**: invalid email format, password strength enforcement, duplicate registration, etc.
- **UI responsiveness** – only one test (logout) sets a mobile viewport; others assume desktop.
- **Error scenarios**: network failures, backend unavailability, unexpected UI states.

## 5. Recommendations

1. **Increase Selector Robustness**
   - Use `data-testid` consistently across all elements (the registration form already does, but login and sidebar could be improved).
   - Avoid relying on placeholder texts for inputs, as they may change.

2. **Add More Validation Checks**
   - After login, verify that the dashboard contains expected content (e.g., "Welcome, admin").
   - After logout, check that `localStorage` no longer contains a session token.
   - After registration, try to log in with the new user to ensure the backend actually created the account.

3. **Use Environment Variables**
   - Move `BASE_URL`, `BACKEND_URL`, and credentials to environment variables or a config file to avoid hardcoding.

4. **Improve Sidebar Handling**
   - In `admin_logout.spec.ts`, explicitly set a viewport size (like 375x667) to ensure the toggle button is necessary and works consistently.
   - After clicking the toggle button, wait for the sidebar to become visible before clicking logout.

5. **Add Cleanup Steps**
   - In `register_admin_delete.spec.ts`, consider deleting the user even if the test fails, to avoid polluting the database. This can be done in a `finally` block or using test hooks.

6. **Test for Negative Scenarios**
   - Add tests for:
     - Invalid login (wrong password, non‑existent user).
     - Duplicate registration.
     - Registration with invalid email.
     - Admin trying to delete a non‑existent user.
   - These can be implemented as unit tests or separate E2E tests.

7. **Consider Using Page Object Model**
   - The current tests are written in a procedural style. Extracting page objects (e.g., `LoginPage`, `DashboardPage`, `Sidebar`) would reduce duplication and improve maintainability.

8. **Document Test Data**
   - The admin credentials `admin`/`123` are assumed to exist. Ensure these are seeded in the test environment before tests run.

9. **API Test Independence**
   - In `register_admin_delete.spec.ts`, the test uses API calls that could be separated into dedicated API tests. Mixing UI and API is powerful but should be used judiciously to avoid tight coupling.

## 6. Conclusion

The current E2E test suite for the authentication module provides a solid foundation by covering the most critical user flows: login, logout, registration, form validation, and administrative user deletion. The tests are well‑structured, use appropriate selectors (some with `data-testid`), and include a complex scenario that combines UI and API interactions.

By implementing the recommendations above, the test suite can be made even more robust, maintainable, and comprehensive, ensuring a high level of confidence in the authentication system’s reliability and security.