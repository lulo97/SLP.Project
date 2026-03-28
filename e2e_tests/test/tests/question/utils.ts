
import { Locator, Page, expect } from "@playwright/test";

export const FRONTEND_URL = "http://localhost:3009";
const ADMIN_USERNAME = "test1";
const ADMIN_PASSWORD = "2";

/**
 * Log in as the admin user.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(FRONTEND_URL);
  await page.getByPlaceholder("Enter your username").fill(ADMIN_USERNAME);
  await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);
}

/**
 * Navigate to the question list and click the create button.
 */
export async function navigateToCreateQuestion(page: Page): Promise<void> {
  await page.goto(`${FRONTEND_URL}/questions`);
  await expect(page).toHaveURL(`${FRONTEND_URL}/questions`);
  const createButton = page.getByTestId("create-question");
  await createButton.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/question/new`);
}

/**
 * Fill the common fields of the question form.
 * @param page Playwright page
 * @param data.title – question title (required)
 * @param data.description – optional description
 * @param data.type – question type, e.g. "multiple_choice"
 * @param data.explanation – optional explanation
 * @param data.tags – array of tag names
 */
export async function fillCommonFields(
  page: Page,
  data: {
    title: string;
    description?: string;
    type: string;
    explanation?: string;
    tags?: string[];
  },
): Promise<void> {
  // Title
  const titleInput = page.getByTestId("question-title");
  await titleInput.fill(data.title);

  // Description
  if (data.description) {
    const descriptionInput = page.getByTestId("question-description");
    await descriptionInput.fill(data.description);
  }

  // Type
  const typeSelect = page.getByTestId("question-type-select");
  await typeSelect.click();
  await page.getByTestId(`option-${data.type}`).click();

  // Explanation
  if (data.explanation) {
    const explanationInput = page.getByTestId("question-explanation");
    await explanationInput.fill(data.explanation);
  }

  // Tags (TagSelector component)
  if (data.tags && data.tags.length > 0) {
    const tagSelector = page.getByTestId("tag-selector");
    await tagSelector.click();
    const tagInput = tagSelector.locator("input");
    for (const tag of data.tags) {
      await tagInput.fill(tag);
      await tagInput.press("Enter");
    }
    await tagInput.press("Escape"); // close dropdown
  }
}

/**
 * Submit the question form and verify redirection to the list page.
 */
export async function submitQuestion(page: Page): Promise<void> {
  const submitButton = page.getByTestId("submit-question");
  await submitButton.click();
  await expect(page).toHaveURL(`${FRONTEND_URL}/questions`);
}

/**
 * Generate a unique question title using a prefix and a timestamp.
 */
export function getUniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

/**
 * Verify that a question with the given title appears in the list,
 * then delete it.
 */
export async function verifyAndDeleteQuestion(
  page: Page,
  title: string,
): Promise<void> {
  // Search for the question by title
  const searchInput = page.getByTestId("question-search");
  await searchInput.fill(title);
  await searchInput.press("Enter");

  // Locate the list item containing the title
  const item = page
    .locator(`[data-testid^="question-item-"]:has-text("${title}")`)
    .first();

  await expect(item).toBeVisible();

  // Extract the question ID from the testid (e.g., "question-item-123")
  const itemTestId = await item.getAttribute("data-testid");
  const questionId = itemTestId?.replace("question-item-", "");
  if (!questionId)
    throw new Error(
      `Could not extract question ID from item with title "${title}"`,
    );

  // Click the delete button
  const deleteButton = page.getByTestId(`delete-question-btn-${questionId}`);
  await deleteButton.click();

  // Confirm deletion in the popconfirm
  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();

  // Wait for the item to disappear
  await expect(item).not.toBeVisible();
}

export async function getQuestionIdFromItem(item: Locator): Promise<string> {
  const testId = await item.getAttribute("data-testid");
  if (!testId) throw new Error("Item missing data-testid");
  const match = testId.match(/question-item-(\d+)/);
  if (!match) throw new Error(`Could not extract ID from testid: ${testId}`);
  return match[1];
}
