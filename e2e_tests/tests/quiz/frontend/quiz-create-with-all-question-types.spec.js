import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  API_BASE_URL,
  loginAsAdmin,
  createAuthenticatedPage,
  createQuiz,
  deleteQuizViaApi,
  addQuestionToQuiz,
} from './quiz-test-utils.js';

test.setTimeout(90000);

test.describe('Create quiz with all question types', () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  test('should create a quiz with multiple choice, true/false, fill blank, ordering, and matching', async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser, authToken);
    const { id: quizId, title } = await createQuiz(page);

    const questions = [
      {
        type: 'multiple_choice',
        content: 'What does CPU stand for?',
        description: 'Central Processing Unit',
        options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Process Unit', 'Computer Processing Unit'],
        correctIndices: [0],
      },
      {
        type: 'true_false',
        content: 'HTTP stands for HyperText Transfer Protocol.',
        correctAnswer: true,
      },
      {
        type: 'fill_blank',
        content: 'The programming language C# was developed by Microsoft for the .NET platform.',
        keyword: 'C#',
      },
      {
        type: 'ordering',
        content: 'Order the OSI model layers from bottom to top:',
        items: ['Physical', 'Data Link', 'Network', 'Transport'],
      },
      {
        type: 'matching',
        content: 'Match the protocol with its default port:',
        pairs: [
          { left: 'HTTP', right: '80' },
          { left: 'HTTPS', right: '443' },
          { left: 'FTP', right: '21' },
          { left: 'SSH', right: '22' },
        ],
      },
    ];

    for (const q of questions) {
      await addQuestionToQuiz(page, q.type, q);
    }

    // Verify total number of questions
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(page.locator('[data-testid="questions-total"]')).toHaveText(`Total: ${questions.length}`);

    // Verify each question appears
    for (const q of questions) {
      await expect(page.locator(`.font-medium:has-text("${q.content}")`)).toBeVisible();
    }

    await deleteQuizViaApi(request, authToken, quizId);
    await page.close();
  });
});