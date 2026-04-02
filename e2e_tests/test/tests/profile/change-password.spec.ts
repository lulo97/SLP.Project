// e2e_tests/test/tests/login/user_change_password_admin_delete.spec.ts
import { test, expect, Page } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  ADMIN_CREDENTIALS,
  generateUniqueUser,
  getSessionToken,
  login,
  logout,
} from "../login/utils";

test("UI: create user A, change password, login success, admin deletes user A via API", async ({
  page,
  browser,
}) => {
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
    await expect(
      page.getByRole("heading", { name: "Welcome Back" }),
    ).toBeVisible();
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

  // ---- Step 3: UI change password via profile page ----
  await test.step("UI: change password", async () => {
    await page.goto(`${FRONTEND_URL}/profile`);
    await expect(page.getByTestId("account-settings-card")).toBeVisible();

    // Open change password modal
    await page.getByTestId("btn-open-change-password").click();

    // Fill the modal form using data-testid
    const modal = page.getByTestId("modal-change-password");
    await page.getByTestId("input-current-password").fill(originalPassword);
    await page.getByTestId("input-new-password").fill(newPassword);
    await page.getByTestId("input-confirm-password").fill(newPassword);

    // Click update button using its data-testid
    await page.getByTestId("btn-update-password").click();

    // Wait for modal to close (success)
    await expect(modal).toBeHidden();
  });

  // ---- Step 4: Logout and verify login with new password ----
  await test.step("UI: logout and login with new password", async () => {
    await logout(page);
    await login(page, userA.username, newPassword);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
    console.log("Login with new password succeeded");
  });

  // ---- Step 5: Logout user A ----
  await test.step("UI: logout user A", async () => {
    await logout(page);
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
  });

  // ---- Step 6: Admin login and delete user A via API ----
  let adminToken: string | null = null;
  await test.step("UI: login as admin to get session token", async () => {
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
    adminToken = await getSessionToken(page);
    expect(adminToken).toBeTruthy();
  });

  await test.step("API: admin deletes user A", async () => {
    const deleteResponse = await request.delete(
      `${BACKEND_URL}/api/users/${userIdA}`,
      {
        headers: { "X-Session-Token": adminToken! },
      },
    );
    expect(deleteResponse.ok()).toBeTruthy();
    const result = await deleteResponse.json();
    expect(result.message).toContain("User deleted successfully");
    console.log(`Admin deleted user A (ID: ${userIdA})`);
  });

  // ---- Step 7: Verify user A can no longer log in ----
  await test.step("UI: logout admin and verify user A login fails", async () => {
    await logout(page);
    await login(page, userA.username, newPassword);
    await expect(
      page.getByText(/Invalid username or password/i).first(),
    ).toBeVisible({
      timeout: 5000,
    });
    await expect(page).toHaveURL(`${FRONTEND_URL}/login`);
    console.log("User A cannot login after deletion – correct");
  });

  await context.close();
});
