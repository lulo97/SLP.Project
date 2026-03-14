import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  API_BASE_URL,
  generateUniqueName,
  loginAsAdmin,
  createAuthenticatedPage,
  createQuiz,
  deleteQuizViaApi,
} from "./quiz-test-utils";

test.describe("Quiz Question: Fill Blank", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  test("Add a fill blank question to a quiz", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id } = await createQuiz(page);

    // Click add question
    await page.click('[data-testid="add-question-button"]');
    await page.waitForSelector('.ant-modal-content');
    await page.waitForTimeout(300);

    // Generate keyword and title that includes it
    const keyword = `keyword_${Date.now()}`;
    const questionTitle = `Fill blank question: ${keyword}`;

    // Fill common fields
    await page.fill('[data-testid="question-title"]', questionTitle);

    // Select type
    await page.click('[data-testid="question-type"]');
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await page.click('.ant-select-dropdown .ant-select-item-option:has-text("Fill Blank")');
    await page.waitForSelector('.ant-select-dropdown', { state: 'hidden' });

    // Fill keyword
    await page.fill('[data-testid="fill-blank-keyword"]', keyword);

    // Add a tag (optional)
    await page.fill('[data-testid="question-tags"] input', 'e2e');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Click outside to close dropdown
    await page.click('.ant-modal-header');

    // Submit
    await expect(page.locator('[data-testid="submit-question"]')).toBeEnabled();
    await page.click('[data-testid="submit-question"]');

    // Wait for modal to close and success message
    await page.waitForSelector('.ant-modal-content', { state: 'hidden' });
    await expect(page.locator('.ant-message-success')).toBeVisible();

    // Verify question appears
    await expect(page.locator(`.font-medium:has-text("${questionTitle}")`)).toBeVisible();
    await expect(page.locator('[data-testid="questions-total"]')).toHaveText("Total: 1");

    await deleteQuizViaApi(request, authToken, id);
    await page.close();
  });
});