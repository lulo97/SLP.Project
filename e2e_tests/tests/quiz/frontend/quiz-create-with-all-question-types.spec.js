// e2e_tests/tests/quiz/frontend/quiz-create-with-all-question-types.spec.js
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

// Increase timeout for this test because we're adding many questions
test.setTimeout(90000);

/**
 * Helper to create a quiz question via API.
 * @param {string} token - session token
 * @param {number} quizId - ID of the quiz
 * @param {object} questionSnapshot - the question data (type, content, metadata, etc.)
 * @param {number} displayOrder - order in the quiz
 * @returns {Promise<object>} created question object
 */
async function createQuizQuestionViaApi(token, quizId, questionSnapshot, displayOrder) {
  const response = await fetch(`${API_BASE_URL}/quiz/${quizId}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': token,
    },
    body: JSON.stringify({
      questionSnapshotJson: JSON.stringify(questionSnapshot),
      displayOrder,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create quiz question: ${response.status} ${text}`);
  }
  return response.json();
}

test.describe('Create quiz with all question types', () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  test('should create a quiz with multiple choice, true/false, fill blank, ordering, matching, and a flashcard', async ({ browser, request }) => {
    // 1. Create a quiz via UI
    const page = await createAuthenticatedPage(browser, authToken);
    const { id: quizId, title } = await createQuiz(page);

    // 2. Define the question configurations (all with meaningful IT content)
    const questions = [
      {
        type: 'multiple_choice',
        content: 'What does CPU stand for?',
        description: 'Central Processing Unit',
        options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Process Unit', 'Computer Processing Unit'],
        correctIndices: [0], // single correct answer
      },
      {
        type: 'true_false',
        content: 'HTTP stands for HyperText Transfer Protocol.',
        correctAnswer: true,
      },
      {
        type: 'fill_blank',
        content: 'The programming language C# was developed by Microsoft for the .NET platform.',
        keyword: 'C#', // must appear in content
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

    // 3. Add each question via UI
    for (const q of questions) {
      await addQuestionToQuiz(page, q.type, q);
    }

    // 4. Add a flashcard question via API (UI does not support flashcard creation)
    const flashcard = {
      type: 'flashcard',
      content: 'What is an IP address?',
      metadata: {
        front: 'IP address',
        back: 'A unique identifier assigned to each device connected to a network that uses the Internet Protocol.',
      },
      explanation: 'IP addresses are fundamental for networking.',
    };
    const flashcardOrder = questions.length + 1; // after all UI questions
    await createQuizQuestionViaApi(authToken, quizId, flashcard, flashcardOrder);

    // 5. Verify the total number of questions shown in the UI
    await page.goto(`${FRONTEND_URL}/quiz/${quizId}`);
    await expect(page.locator('[data-testid="questions-total"]')).toHaveText(`Total: ${questions.length + 1}`);

    // 6. Verify the flashcard appears
    await expect(page.locator(`text=${flashcard.content}`)).toBeVisible();

    // 7. Clean up
    await deleteQuizViaApi(request, authToken, quizId);
    await page.close();
  });
});