// e2e_tests/test/tests/question/ordering.spec.ts
import { test, expect } from "@playwright/test";

const FRONTEND_URL = "http://localhost:4000";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "123";

test("create and delete an ordering question as admin", async ({ page }) => {
  // Generate unique question title
  const timestamp = Date.now();
  const questionTitle = `Test Ordering Question ${timestamp}`;
  const explanationText = `Explanation for ${timestamp}`;
  const tagName = `order-tag-${timestamp}`;

  // Step 1: Log in as admin
  await test.step("Login as admin", async () => {
    await page.goto(FRONTEND_URL);

    const usernameInput = page.getByPlaceholder("Enter your username");
    const passwordInput = page.getByPlaceholder("Enter your password");
    const signInButton = page.getByRole("button", { name: "Sign In" });

    await usernameInput.fill(ADMIN_USERNAME);
    await passwordInput.fill(ADMIN_PASSWORD);
    await signInButton.click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
  });

  // Step 2: Navigate to question list and click create button
  await test.step("Go to question list and open create form", async () => {
    await page.goto(`${FRONTEND_URL}/questions`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/questions`);

    const createButton = page.getByTestId("create-question");
    await createButton.click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/question/new`);
  });

  // Step 3: Fill the ordering form
  await test.step("Fill ordering question details", async () => {
    // Question title
    const titleInput = page.getByTestId("question-title");
    await titleInput.fill(questionTitle);

    // Description (optional)
    const descriptionInput = page.getByTestId("question-description");
    await descriptionInput.fill(
      "This is a test description for the ordering question.",
    );

    // Select ordering type
    const typeSelect = page.getByTestId("question-type-select");
    await typeSelect.click();
    await page.getByTestId("option-ordering").click();

    // Fill ordering items (by default there are 4 empty inputs)
    const itemInput0 = page.getByTestId("ordering-item-0");
    const itemInput1 = page.getByTestId("ordering-item-1");
    const itemInput2 = page.getByTestId("ordering-item-2");
    const itemInput3 = page.getByTestId("ordering-item-3");

    await itemInput0.fill("First step");
    await itemInput1.fill("Second step");
    await itemInput2.fill("Third step");
    await itemInput3.fill("Fourth step");

    // 1. Add a new item
    const addItemButton = page.getByTestId("ordering-add");
    await addItemButton.click();

    // The new item will have index 4 (since we started with 4 items)
    const newItemInput = page.getByTestId("ordering-item-4");
    await newItemInput.fill("New item added");

    // 2. Delete the newly added item
    const deleteNewItemButton = page.getByTestId("ordering-remove-4");
    await deleteNewItemButton.click();

    // Verify the new item is gone (optional)
    await expect(newItemInput).not.toBeVisible();

    // 3. Edit the third item (index 2, zero-based)
    const itemToEdit = page.getByTestId("ordering-item-2");
    await itemToEdit.fill("Edited third step");

    // Explanation
    const explanationInput = page.getByTestId("question-explanation");
    await explanationInput.fill(explanationText);

    // Add a tag with timestamp
    const tagSelector = page.getByTestId("tag-selector");
    await tagSelector.click();
    const tagInput = tagSelector.locator("input");
    await tagInput.fill(tagName);
    await tagInput.press("Enter");
    await tagInput.press("Escape");
  });

  // Step 4: Submit the form
  await test.step("Submit the question", async () => {
    const submitButton = page.getByTestId("submit-question");
    await submitButton.click();

    // After successful creation, we should be redirected to the question list
    await expect(page).toHaveURL(`${FRONTEND_URL}/questions`);
  });

  // Step 5: Verify the question appears in the list and delete it
  await test.step("Verify new question appears in list and delete it", async () => {
    // Use search to filter by title
    const searchInput = page.getByTestId("question-search");
    await searchInput.fill(questionTitle);
    await searchInput.press("Enter");

    // Wait for the list item to appear
    const item = page
      .locator(`li[data-testid^="question-item-"]:has-text("${questionTitle}")`)
      .first();
    await expect(item).toBeVisible();

    // Extract question ID from the item's data-testid
    const itemTestId = await item.getAttribute("data-testid");
    const questionId = itemTestId?.replace("question-item-", "");
    if (!questionId) throw new Error("Could not extract question ID");

    // Click the delete button using the dynamic test ID
    const deleteButton = page.getByTestId(`delete-question-btn-${questionId}`);
    await deleteButton.click();

    // Confirm deletion in the popconfirm
    const confirmButton = page.getByRole("button", { name: "Yes" });
    await confirmButton.click();

    // Wait for the item to disappear
    await expect(item).not.toBeVisible();
  });
});
