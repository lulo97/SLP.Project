// e2e_tests/test/tests/profile/change-password-confirm-null.spec.ts
import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  generateUniqueUser,
  getSessionToken,
  login,
  logout,
} from "../login/utils";

test("UI: confirm password empty should show validation error", async ({ page, browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const request = context.request;

  const originalPassword = "Test123!";
  const newPassword = "NewPass456!";
  const userA = generateUniqueUser();
  userA.password = originalPassword;

  let userIdA: number;

  // ---- Step 1: UI Registration of user A ----
  await test.step("UI: register user A", async () => {
    await page.goto(`${FRONTEND_URL}/register`);
    await page.getByTestId("input-username").fill(userA.username);
    await page.getByTestId("input-email").fill(userA.email);
    await page.getByTestId("input-password").fill(originalPassword);
    await page.getByTestId("input-confirm-password").fill(originalPassword);
    await page.getByTestId("button-submit").click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  });

  // Capture user ID via API
  await test.step("API: get user A ID", async () => {
    await login(page, userA.username, originalPassword);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
    const token = await getSessionToken(page);
    expect(token).toBeTruthy();

    const userResponse = await request.get(`${BACKEND_URL}/api/users/me`, {
      headers: { "X-Session-Token": token! },
    });
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();
    userIdA = userData.id;
    expect(userIdA).toBeDefined();
    console.log(`User A ID captured: ${userIdA}`);

    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 2: UI login as user A ----
  await test.step("UI: login as user A", async () => {
    await login(page, userA.username, originalPassword);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  // ---- Step 3: UI attempt to change password with empty confirm password ----
  await test.step("UI: attempt change password (empty confirm password)", async () => {
    await page.goto(`${FRONTEND_URL}/profile`);
    await expect(page.getByTestId("account-settings-card")).toBeVisible();

    // Open change password modal
    await page.getByTestId("btn-open-change-password").click();

    const modalForm = page.getByTestId("form-change-password");
    // Fill current password and new password, but leave confirm empty
    await page.getByTestId("input-current-password").fill(originalPassword);
    await page.getByTestId("input-new-password").fill(newPassword);
    await page.getByTestId("input-confirm-password").fill("");

    // Click update button
    await page.getByTestId("btn-update-password").click();

    // Verify front-end validation error appears for confirm password
    const confirmError = page.getByText("Please confirm your new password.");
    await expect(confirmError).toBeVisible();

    // Modal should still be open because validation failed
    await expect(modalForm).toBeVisible();

    // Cancel the modal to clean up
    await page.getByTestId("btn-cancel-password").click();
    await expect(modalForm).toBeHidden();
  });

  // ---- Step 4: Logout user A ----
  await test.step("UI: logout user A", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 5: Admin login and delete user A via API ----
  let adminToken: string | null = null;
  await test.step("UI: login as admin to get session token", async () => {
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
    adminToken = await getSessionToken(page);
    expect(adminToken).toBeTruthy();
  });

  await test.step("API: admin deletes user A", async () => {
    const deleteResponse = await request.delete(`${BACKEND_URL}/api/users/${userIdA}`, {
      headers: { "X-Session-Token": adminToken! },
    });
    expect(deleteResponse.ok()).toBeTruthy();
    const result = await deleteResponse.json();
    expect(result.message).toContain("User deleted successfully");
    console.log(`Admin deleted user A (ID: ${userIdA})`);
  });

  // ---- Step 6: Verify user A can no longer log in (cleanup check) ----
  await test.step("UI: logout admin and verify user A login fails", async () => {
    await logout(page);
    await login(page, userA.username, originalPassword);
    await expect(page.getByText(/Invalid username or password/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
    console.log("User A cannot login after deletion – correct");
  });

  await context.close();
});