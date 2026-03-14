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

test.describe("Quiz Question: Matching", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  test("Add a matching question to a quiz", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id } = await createQuiz(page);

    const questionTitle = await addQuestionToQuiz(page, "matching");
    await expect(page.locator(`.font-medium:has-text("${questionTitle}")`)).toBeVisible();
    await expect(page.locator('[data-testid="questions-total"]')).toHaveText("Total: 1");

    await deleteQuizViaApi(request, authToken, id);
    await page.close();
  });
});