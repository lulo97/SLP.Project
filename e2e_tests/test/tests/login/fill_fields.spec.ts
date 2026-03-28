// login.spec.ts
import { test, expect } from "@playwright/test";

// Frontend URL
const BASE_URL = "http://localhost:3009";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto(BASE_URL);
  });

  test("should fill username and password fields", async ({ page }) => {
    await page.goto(BASE_URL);

    const usernameInput = page.getByPlaceholder("Enter your username");
    const passwordInput = page.getByPlaceholder("Enter your password");

    await usernameInput.fill("testuser");
    await passwordInput.fill("password123");

    // Optional: verify the fields contain the filled values
    await expect(usernameInput).toHaveValue("testuser");
    await expect(passwordInput).toHaveValue("password123");
  });

  test("should show validation errors correctly", async ({ page }) => {
    await page.goto(BASE_URL);

    const usernameInput = page.getByPlaceholder("Enter your username");
    const passwordInput = page.getByPlaceholder("Enter your password");
    const signInButton = page.getByRole("button", { name: "Sign In" });

    // Scenario 1: Both fields empty → only username error appears
    await signInButton.click();

    await expect(page.getByText("Username is required")).toBeVisible();
    await expect(page.getByText("Password is required")).not.toBeVisible();

    // Scenario 2: Only username filled → only password error appears
    await usernameInput.fill("testuser");
    await signInButton.click();

    await expect(page.getByText("Username is required")).not.toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });
});
