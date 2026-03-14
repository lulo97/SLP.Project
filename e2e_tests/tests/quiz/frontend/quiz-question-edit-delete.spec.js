import { test, expect } from "@playwright/test";
import {
  FRONTEND_URL,
  API_BASE_URL,
  generateUniqueName,
  loginAsAdmin,
  createAuthenticatedPage,
  createQuiz,
  deleteQuizViaApi,
  addQuestionToQuiz,
} from "./quiz-test-utils";

test.describe("Quiz Question: Edit and Delete", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  // Helper to get question ID from its title
  async function getQuestionIdByTitle(page, title) {
    const titleSpan = page.locator(`.font-medium:has-text("${title}")`).first();
    await expect(titleSpan).toBeVisible();
    const questionContainer = titleSpan.locator('xpath=ancestor::div[contains(@class, "relative")]');
    const deleteButton = questionContainer.locator('[data-testid^="delete-question-"]');
    await expect(deleteButton).toBeVisible();
    const testId = await deleteButton.getAttribute("data-testid");
    return testId.replace("delete-question-", "");
  }

  test("Add a multiple choice question, edit it, and delete it", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id } = await createQuiz(page);

    // Add a question
    const originalTitle = await addQuestionToQuiz(page, "multiple_choice");
    const questionId = await getQuestionIdByTitle(page, originalTitle);

    // Edit it
    await page.click(`[data-testid="edit-question-${questionId}"]`);
    await page.waitForSelector('.ant-modal-content', { state: 'visible' });
    await page.waitForSelector('[data-testid="question-title"]', { state: 'visible' });

    const editedTitle = `${originalTitle} EDITED`;
    await page.fill('[data-testid="question-title"]', editedTitle);
    await page.click('[data-testid="submit-question"]');

    // Wait for success message and modal to close
    await expect(page.locator('.ant-message-success:has-text("Question updated")')).toBeVisible();
    await page.waitForSelector('.ant-modal-content', { state: 'hidden' });

    // Verify edited title appears
    await expect(page.locator(`.font-medium:has-text("${editedTitle}")`)).toBeVisible();

    // Delete it
    await page.click(`[data-testid="delete-question-${questionId}"]`);
    await expect(page.locator('.ant-message-success:has-text("Question deleted")')).toBeVisible();
    await expect(page.locator(`.font-medium:has-text("${editedTitle}")`)).not.toBeVisible();

    // API check
    const questionsResponse = await request.get(`${API_BASE_URL}/quiz/${id}/questions`, {
      headers: { 'X-Session-Token': authToken },
    });
    expect(questionsResponse.status()).toBe(200);
    const questions = await questionsResponse.json();
    expect(questions.find(q => q.id === parseInt(questionId))).toBeUndefined();

    await deleteQuizViaApi(request, authToken, id);
    await page.close();
  });
});