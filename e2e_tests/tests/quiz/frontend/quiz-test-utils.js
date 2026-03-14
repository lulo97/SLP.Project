import { expect } from '@playwright/test';

export const FRONTEND_URL = 'http://localhost:4000';
export const API_BASE_URL = 'http://localhost:3001/api';
export const adminUser = { username: 'admin', password: '123' };

export function generateUniqueName(base) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return `${base} ${id}`;
}

export async function loginAsAdmin(request) {
  const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      username: adminUser.username,
      password: adminUser.password,
    },
  });
  expect(loginRes.status()).toBe(200);
  const loginBody = await loginRes.json();
  return loginBody.token;
}

export async function createAuthenticatedPage(browser, token) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript((t) => {
    localStorage.setItem('session_token', t);
  }, token);
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page.locator('[data-testid="tab-my-quizzes"]')).toBeVisible({ timeout: 10000 });
  return page;
}

export async function createQuiz(page, customTitle = null) {
  const title = customTitle || generateUniqueName('Quiz');
  const description = `Description for ${title}`;

  await page.goto(`${FRONTEND_URL}/quiz/new`);
  await page.fill('[data-testid="quiz-title-input"]', title);
  await page.fill('[data-testid="quiz-description-input"]', description);
  await page.locator('[data-testid="quiz-tags-select"] input').fill('e2e');
  await page.locator('[data-testid="quiz-tags-select"] input').press('Enter');
  await page.keyboard.press('Escape');

  await page.click('[data-testid="quiz-submit-button"]');
  await page.waitForURL(/\/quiz\/\d+$/);
  const url = page.url();
  const id = parseInt(url.split('/').pop(), 10);
  return { id, title };
}

// FIXED: Use X-Session-Token header instead of Authorization Bearer
export async function deleteQuizViaApi(request, token, id) {
  const response = await request.delete(`${API_BASE_URL}/quiz/${id}`, {
    headers: { 'X-Session-Token': token },
  });
  expect(response.status()).toBe(200);
}

// FIXED: Use X-Session-Token header
export async function createSourceViaApi(token) {
  const title = generateUniqueName('Source');
  const response = await fetch(`${API_BASE_URL}/source`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': token,
    },
    body: JSON.stringify({
      type: 'text',
      title,
      content: 'Test source content',
    }),
  });
  expect(response.status).toBe(201);
  const source = await response.json();
  return source;
}

// FIXED: Use X-Session-Token header
export async function deleteSourceViaApi(token, id) {
  const response = await fetch(`${API_BASE_URL}/source/${id}`, {
    method: 'DELETE',
    headers: { 'X-Session-Token': token },
  });
  expect(response.status).toBe(200);
}

export async function addQuestionToQuiz(page, questionType = 'multiple_choice') {
  await page.click('[data-testid="add-question-button"]');
  await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'visible' });

  const questionTitle = generateUniqueName('Q');
  await page.fill('[data-testid="question-title"]', questionTitle);
  await page.fill('[data-testid="question-description"]', 'Question description');

  await page.click('[data-testid="question-type"]');
  await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  const typeLabel = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    fill_blank: 'Fill Blank',
    ordering: 'Ordering',
    matching: 'Matching',
  }[questionType] || 'Multiple Choice';
  await page.click(`.ant-select-dropdown .ant-select-item-option:has-text("${typeLabel}")`);
  try {
    await page.waitForSelector('.ant-select-dropdown', { state: 'hidden', timeout: 2000 });
  } catch {
    await page.keyboard.press('Escape');
  }

  if (questionType === 'multiple_choice') {
    const options = ['A', 'B', 'C'];
    for (let i = 0; i < options.length; i++) {
      await page.fill(`[data-testid="mc-option-${i}-input"]`, options[i]);
    }
    await page.click('[data-testid="mc-option-0-checkbox"]');
    await page.click('[data-testid="mc-option-2-checkbox"]');
  } else if (questionType === 'true_false') {
    await page.click('[data-testid="true-false-true"]');
  }

  await page.locator('[data-testid="question-tags"] input').fill('e2e');
  await page.locator('[data-testid="question-tags"] input').press('Enter');
  await page.keyboard.press('Escape');

  await page.click('[data-testid="submit-question"]');
  await page.waitForSelector('[data-testid="question-form-modal"]', { state: 'hidden' });

  await expect(page.locator(`.ant-list-item:has-text("${questionTitle}")`)).toBeVisible();
  return questionTitle;
}