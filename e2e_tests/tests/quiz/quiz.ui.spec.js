import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:4000';
const API_BASE_URL = 'http://localhost:3001/api';

const adminUser = {
  username: 'admin',
  password: '123',
};

// Helper to generate unique identifiers
function generateUniqueName(base) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return `${base} ${id}`;
}

test.describe('Quiz CRUD and interactions', () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    // Login as admin and store token
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    authToken = loginBody.token;
  });

  // Helper to create an authenticated page
  async function createAuthenticatedPage(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Inject token into localStorage before page loads
    await page.addInitScript((token) => {
      localStorage.setItem('session_token', token);
    }, authToken);

    // Navigate to quiz list and wait for it to load
    await page.goto(`${FRONTEND_URL}/quiz`);
    await expect(page.locator('[data-testid="tab-my-quizzes"]')).toBeVisible({ timeout: 10000 });

    return page;
  }

  // Helper to create a quiz via UI and return its ID and title
  async function createQuiz(page, customTitle = null) {
    const title = customTitle || generateUniqueName('Quiz');
    const description = `Description for ${title}`;

    await page.goto(`${FRONTEND_URL}/quiz/new`);
    await page.fill('[data-testid="quiz-title-input"]', title);
    await page.fill('[data-testid="quiz-description-input"]', description);
    // Visibility default is public, leave as is
    // Tags: add a tag
    await page.locator('[data-testid="quiz-tags-select"] input').fill('e2e');
    await page.locator('[data-testid="quiz-tags-select"] input').press('Enter');
    // Submit
    await page.click('[data-testid="quiz-submit-button"]');

    // Wait for redirect to quiz detail page
    await page.waitForURL(/\/quiz\/\d+$/);
    const url = page.url();
    const id = parseInt(url.split('/').pop(), 10);
    return { id, title };
  }

  // Helper to get quiz ID from current detail page URL
  async function getCurrentQuizId(page) {
    const url = page.url();
    expect(url).toMatch(/\/quiz\/\d+$/);
    return parseInt(url.split('/').pop(), 10);
  }

  // Helper to delete a quiz via API
  async function deleteQuizViaApi(request, id) {
    const response = await request.delete(`${API_BASE_URL}/quiz/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status()).toBe(200);
  }

  // Helper to create a source via API (for source attachment tests)
  async function createSourceViaApi() {
    const title = generateUniqueName('Source');
    const response = await fetch(`${API_BASE_URL}/source`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: 'text',
        title,
        content: 'This is a test source content.',
      }),
    });
    expect(response.status).toBe(201);
    const source = await response.json();
    return source;
  }

  // Helper to delete a source via API
  async function deleteSourceViaApi(id) {
    const response = await fetch(`${API_BASE_URL}/source/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status).toBe(200);
  }

  // Helper to add a question to a quiz via UI (simplified: just create a multiple choice question)
  async function addQuestionToQuiz(page) {
    // On quiz detail page, click Add Question
    await page.click('[data-testid="add-question-button"]');
    // Wait for modal
    await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'visible' });

    // Fill question form – we rely on the question form's own testids (as defined in question feature)
    // This assumes the question form modal contains the same testids as the standalone question form.
    // We'll fill a simple multiple choice question.
    const questionTitle = generateUniqueName('MCQ');
    await page.fill('[data-testid="question-title"]', questionTitle);
    await page.fill('[data-testid="question-description"]', 'Description for MCQ');

    // Select type "Multiple Choice"
    await page.click('[data-testid="question-type"]');
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await page.click('.ant-select-dropdown .ant-select-item-option:has-text("Multiple Choice")');
    // Wait for dropdown to close
    try {
      await page.waitForSelector('.ant-select-dropdown', { state: 'hidden', timeout: 2000 });
    } catch {
      await page.keyboard.press('Escape');
    }

    // Fill options
    const options = ['Option A', 'Option B', 'Option C'];
    for (let i = 0; i < options.length; i++) {
      await page.fill(`[data-testid="mc-option-${i}-input"]`, options[i]);
    }
    // Select first and third as correct
    await page.click('[data-testid="mc-option-0-checkbox"]');
    await page.click('[data-testid="mc-option-2-checkbox"]');

    // Add a tag
    await page.locator('[data-testid="question-tags"] input').fill('e2e');
    await page.locator('[data-testid="question-tags"] input').press('Enter');
    await page.keyboard.press('Escape'); // close dropdown

    // Submit question
    await page.click('[data-testid="submit-question"]');

    // Wait for modal to close and question to appear in the list
    await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'hidden' });
    // Verify the question appears in the list (by its title)
    await expect(page.locator(`.ant-list-item:has-text("${questionTitle}")`)).toBeVisible();
    return questionTitle;
  }

  test.describe('Quiz CRUD', () => {
    test('Create a quiz with minimal fields', async ({ browser, request }) => {
      const page = await createAuthenticatedPage(browser);
      const { id, title } = await createQuiz(page);

      // Verify redirect to detail page and that title is shown
      await expect(page.locator('[data-testid="quiz-title"]')).toHaveText(title);
      await expect(page.locator('[data-testid="quiz-description"]')).toHaveText(`Description for ${title}`);
      await expect(page.locator('[data-testid="quiz-visibility"]')).toHaveText('public');

      // Go back to list and verify it appears in "My Quizzes"
      await page.goto(`${FRONTEND_URL}/quiz`);
      await expect(page.locator(`[data-testid="quiz-list-item-${id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="quiz-title-link-${id}"]`)).toHaveText(title);

      // Clean up
      await deleteQuizViaApi(request, id);
      await page.close();
    });

    test('Edit a quiz', async ({ browser, request }) => {
      const page = await createAuthenticatedPage(browser);
      const { id, title } = await createQuiz(page);

      // Go to edit page
      await page.click(`[data-testid="edit-quiz-${id}"]`); // This assumes the edit button is on the detail page actions card
      // Alternatively, from list we could click edit, but we are on detail page. Let's use detail page actions.
      // Actually on detail page, the actions card has an Edit Quiz button with testid "edit-quiz-button".
      // We are on detail page after creation. Click that.
      await page.click('[data-testid="edit-quiz-button"]');
      await page.waitForURL(`**/quiz/${id}/edit`);

      const newTitle = `${title} EDITED`;
      await page.fill('[data-testid="quiz-title-input"]', newTitle);
      await page.click('[data-testid="quiz-submit-button"]');
      await page.waitForURL(`**/quiz/${id}`);

      // Verify updated title
      await expect(page.locator('[data-testid="quiz-title"]')).toHaveText(newTitle);

      // Clean up
      await deleteQuizViaApi(request, id);
      await page.close();
    });

    test('Duplicate a quiz', async ({ browser, request }) => {
      const page = await createAuthenticatedPage(browser);
      const { id, title } = await createQuiz(page);

      // On detail page, click duplicate
      await page.click('[data-testid="duplicate-quiz-button"]');
      // Wait for success message and redirect to edit page of duplicated quiz
      await expect(page.locator('.ant-message-success:has-text("Quiz duplicated")')).toBeVisible();
      await page.waitForURL(/\/quiz\/\d+\/edit$/);
      const duplicatedUrl = page.url();
      const duplicatedId = parseInt(duplicatedUrl.split('/').slice(-2, -1)[0], 10);

      // Verify duplicated quiz has same title (maybe with "Copy" suffix? Not sure, but likely same title)
      // We'll go to its detail page
      await page.goto(`${FRONTEND_URL}/quiz/${duplicatedId}`);
      await expect(page.locator('[data-testid="quiz-title"]')).toHaveText(title); // assuming title unchanged

      // Clean up both
      await deleteQuizViaApi(request, id);
      await deleteQuizViaApi(request, duplicatedId);
      await page.close();
    });

    test('Delete a quiz', async ({ browser, request }) => {
      const page = await createAuthenticatedPage(browser);
      const { id, title } = await createQuiz(page);

      // On detail page, click delete
      await page.click('[data-testid="delete-quiz-button"]');
      // Confirm in popconfirm
      await page.click('.ant-popconfirm-buttons .ant-btn-primary');
      await expect(page.locator('.ant-message-success:has-text("Quiz deleted")')).toBeVisible();
      await page.waitForURL('**/quiz');

      // Verify it's gone from list
      await expect(page.locator(`[data-testid="quiz-list-item-${id}"]`)).not.toBeVisible();

      // Optionally verify via API that it's 404
      const response = await request.get(`${API_BASE_URL}/quiz/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status()).toBe(404);

      await page.close();
    });
  });

  test.describe('Quiz notes', () => {
    test('Add and remove a note', async ({ browser, request }) => {
      const page = await createAuthenticatedPage(browser);
      const { id } = await createQuiz(page);

      // Add note
      await page.click('[data-testid="add-note-button"]');
      await page.waitForSelector('[data-testid="add-note-modal"]', { state: 'visible' });

      const noteTitle = generateUniqueName('Note');
      const noteContent = 'This is a test note content.';
      await page.fill('[data-testid="note-title-input"]', noteTitle);
      await page.fill('[data-testid="note-content-input"]', noteContent);
      await page.click('[data-testid="add-note-submit"]');

      // Wait for note to appear
      await expect(page.locator(`[data-testid="note-item-"]`).first()).toBeVisible(); // crude
      // Better: find the note by its title
      const noteItem = page.locator(`.ant-card-body:has-text("${noteTitle}")`).first();
      await expect(noteItem).toBeVisible();

      // Get note ID from testid? We can locate by content and then get the delete button's testid
      const noteId = await noteItem.getAttribute('data-testid'); // e.g., "note-item-123"
      const numericId = noteId.split('-').pop();

      // Delete note
      await page.click(`[data-testid="delete-note-${numericId}"]`);
      // Wait for note to disappear
      await expect(noteItem).not.toBeVisible();

      // Clean up quiz
      await deleteQuizViaApi(request, id);
      await page.close();
    });
  });

  test.describe('Quiz sources', () => {
    test('Attach and detach a source', async ({ browser, request }) => {
      // First create a source via API
      const source = await createSourceViaApi();

      const page = await createAuthenticatedPage(browser);
      const { id } = await createQuiz(page);

      // Open attach source modal
      await page.click('[data-testid="attach-source-button"]');
      await page.waitForSelector('[data-testid="attach-source-modal"]', { state: 'visible' });

      // Select the source checkbox
      await page.click(`[data-testid="source-checkbox-${source.id}"]`);
      // Click attach
      await page.click('[data-testid="attach-sources-submit"]');

      // Wait for source to appear in sources list
      await expect(page.locator(`[data-testid="source-tag-${source.id}"]`)).toBeVisible();

      // Detach source
      await page.click(`[data-testid="source-tag-${source.id}"] .ant-tag-close-icon`);
      // Wait for tag to disappear
      await expect(page.locator(`[data-testid="source-tag-${source.id}"]`)).not.toBeVisible();

      // Clean up
      await deleteQuizViaApi(request, id);
      await deleteSourceViaApi(source.id);
      await page.close();
    });
  });

  test.describe('Quiz questions', () => {
    test('Add, edit, and delete a question inside a quiz', async ({ browser, request }) => {
      const page = await createAuthenticatedPage(browser);
      const { id } = await createQuiz(page);

      // Add a question
      const questionTitle = await addQuestionToQuiz(page);

      // Find the question ID from the DOM (data-testid on question item)
      const questionItem = page.locator(`.ant-list-item:has-text("${questionTitle}")`);
      const testId = await questionItem.getAttribute('data-testid'); // e.g., "question-item-456"
      const questionId = testId.replace('question-item-', '');

      // Edit the question
      await page.click(`[data-testid="edit-question-${questionId}"]`);
      await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'visible' });

      const editedTitle = `${questionTitle} EDITED`;
      await page.fill('[data-testid="question-title"]', editedTitle);
      await page.click('[data-testid="submit-question"]');
      await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'hidden' });

      // Verify edited title appears
      await expect(page.locator(`.ant-list-item:has-text("${editedTitle}")`)).toBeVisible();

      // Delete the question
      await page.click(`[data-testid="delete-question-${questionId}"]`);
      // Confirm? There's no popconfirm? The delete button is a button that emits delete event. It should directly delete.
      // In QuestionsSection.vue, delete emits and is handled by parent. It should show a success message.
      await expect(page.locator('.ant-message-success:has-text("Question deleted")')).toBeVisible();
      await expect(page.locator(`.ant-list-item:has-text("${editedTitle}")`)).not.toBeVisible();

      // Clean up quiz
      await deleteQuizViaApi(request, id);
      await page.close();
    });

    test('Insert a question between existing questions', async ({ browser, request }) => {
      const page = await createAuthenticatedPage(browser);
      const { id } = await createQuiz(page);

      // Add first question (will be at order 1)
      const title1 = await addQuestionToQuiz(page);
      // Add second question (will be at order 2)
      const title2 = await addQuestionToQuiz(page);

      // Now insert a question between them (after first)
      // Locate the insert button after the first question. The button has testid `insert-question-after-{firstQuestionId}`
      const firstQuestionItem = page.locator(`.ant-list-item:has-text("${title1}")`);
      const firstQuestionTestId = await firstQuestionItem.getAttribute('data-testid');
      const firstQuestionId = firstQuestionTestId.replace('question-item-', '');
      await page.click(`[data-testid="insert-question-after-${firstQuestionId}"]`);

      // Wait for modal and fill a question
      await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'visible' });
      const insertedTitle = generateUniqueName('Inserted');
      await page.fill('[data-testid="question-title"]', insertedTitle);
      await page.fill('[data-testid="question-description"]', 'Inserted description');
      // Select type (e.g., True/False) to keep it simple
      await page.click('[data-testid="question-type"]');
      await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      await page.click('.ant-select-dropdown .ant-select-item-option:has-text("True/False")');
      try {
        await page.waitForSelector('.ant-select-dropdown', { state: 'hidden', timeout: 2000 });
      } catch {
        await page.keyboard.press('Escape');
      }
      // Set correct answer
      await page.click('[data-testid="true-false-true"]');
      // Submit
      await page.click('[data-testid="submit-question"]');
      await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'hidden' });

      // Verify the inserted question appears
      await expect(page.locator(`.ant-list-item:has-text("${insertedTitle}")`)).toBeVisible();

      // Verify order: titles should appear in order: title1, insertedTitle, title2
      const allQuestionTitles = await page.locator('.ant-list-item .font-medium').allTextContents();
      const index1 = allQuestionTitles.findIndex(t => t.includes(title1));
      const indexInserted = allQuestionTitles.findIndex(t => t.includes(insertedTitle));
      const index2 = allQuestionTitles.findIndex(t => t.includes(title2));
      expect(index1).toBeLessThan(indexInserted);
      expect(indexInserted).toBeLessThan(index2);

      // Clean up
      await deleteQuizViaApi(request, id);
      await page.close();
    });
  });
});