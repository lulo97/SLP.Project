// e2e_tests/test/tests/question/multiple_choice.spec.ts
import { test, expect } from "@playwright/test";

const FRONTEND_URL = "http://localhost:4000";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "123";

test("create and delete a multiple choice question as admin", async ({
  page,
}) => {
  // Generate unique question title to avoid collisions
  const timestamp = Date.now();
  const questionTitle = `Test MC Question ${timestamp}`;
  const explanationText = `Explanation for ${timestamp}`;

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

  // Step 3: Fill the multiple‑choice form
  await test.step("Fill multiple choice question details", async () => {
    // Question title
    const titleInput = page.getByTestId("question-title");
    await titleInput.fill(questionTitle);

    // Add description (the "Description / Details" field)
    const descriptionInput = page.getByTestId("question-description");
    await descriptionInput.fill(
      "This is a test description for the multiple choice question.",
    );

    // Correct type selection (if needed)
    const typeSelect = page.getByTestId("question-type-select");
    await typeSelect.click(); // opens dropdown
    await page.getByTestId("option-multiple-choice").click(); // select directly by testid

    // Fill options (using indexes 0..3)
    const optionInput0 = page.getByTestId("mc-option-0-input");
    const optionInput1 = page.getByTestId("mc-option-1-input");
    const optionInput2 = page.getByTestId("mc-option-2-input");
    const optionInput3 = page.getByTestId("mc-option-3-input");

    await optionInput0.fill("Apple");
    await optionInput1.fill("Banana");
    await optionInput2.fill("Cherry");
    await optionInput3.fill("Date");

    // Mark Apple as correct
    const correctCheckbox0 = page.getByTestId("mc-option-0-checkbox");
    await correctCheckbox0.check();

    // Add an extra option
    const addOptionButton = page.getByTestId("mc-add-option");
    await addOptionButton.click();

    // Fill the newly added option (index 4)
    const optionInput4 = page.getByTestId("mc-option-4-input");
    await optionInput4.fill("Elderberry");

    // Delete the newly added option (index 4)
    const removeButton4 = page.getByTestId("mc-option-4-remove");
    await removeButton4.click();

    // Edit existing option (index 3) – change "Date" to "Dragonfruit"
    await optionInput3.fill("Dragonfruit");

    // Explanation
    const explanationInput = page.getByTestId("question-explanation");
    await explanationInput.fill(explanationText);

    // Add a tag with timestamp
    const tagName = `fruit-${timestamp}`;
    const tagSelector = page.getByTestId("tag-selector");

    // Assuming TagSelector uses an Ant Design Select with tags mode,
    // click to open dropdown and type the new tag
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

  // Step 5: Verify the question appears in the list Delete the question
  await test.step("Verify new question appears in list Delete the question", async () => {
    // Use search to filter by title (avoids pagination issues)
    const searchInput = page.getByTestId("question-search");
    await searchInput.fill(questionTitle);
    await searchInput.press("Enter");

    // 2. Wait for the list to contain the question item
    const item = page
      .locator(`li[data-testid^="question-item-"]:has-text("${questionTitle}")`)
      .first();
    await expect(item).toBeVisible();

    // 3. Get the question ID from the item's data-testid
    const itemTestId = await item.getAttribute("data-testid");
    const questionId = itemTestId?.replace("question-item-", "");
    if (!questionId) throw new Error("Could not extract question ID");

    // 4. Click the delete button using the dynamic test ID
    const deleteButton = page.getByTestId(`delete-question-btn-${questionId}`);
    await deleteButton.click();

    // 5. Confirm deletion in the popconfirm
    const confirmButton = page.getByRole("button", { name: "Yes" });
    await confirmButton.click();

    // 6. Wait for the item to disappear
    await expect(item).not.toBeVisible();
  });
});
