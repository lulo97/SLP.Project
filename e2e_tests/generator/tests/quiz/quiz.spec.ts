/**
 * generate_quiz.spec.ts
 *
 * Reads `data_quiz.json` (located next to this file) and creates every quiz
 * listed there, including all of its questions, using the configured account.
 *
 * To change quizzes / questions → edit "quizzes" array in data_quiz.json
 * To change account             → edit "account" block in data_quiz.json
 * To change the app URL         → edit "frontendUrl" in data_quiz.json
 *
 * Supported question types inside a quiz:
 *   multiple-choice | true-false | fill-blank | ordering | matching
 *
 * Each quiz test:
 *   1. Creates the quiz (title, description, visibility, tags)
 *   2. Adds every question via the in-page modal
 *   3. Verifies the total question count
 */

import { test, expect, Page, Locator, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

interface McOption {
  text: string;
  correct: boolean;
}

interface MatchingPair {
  left: string;
  right: string;
}

interface QuestionData {
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'ordering' | 'matching';
  title: string;
  description?: string;
  explanation?: string;
  tags?: string[];
  options?: McOption[];    // multiple-choice
  answer?: boolean;        // true-false
  keyword?: string;        // fill-blank
  items?: string[];        // ordering
  pairs?: MatchingPair[];  // matching
}

interface QuizData {
  title: string;
  description?: string;
  visibility: 'public' | 'private';
  tags?: string[];
  questions: QuestionData[];
}

interface Config {
  account: { username: string; password: string };
  frontendUrl: string;
  quizzes: QuizData[];
}

// ─── Load config ──────────────────────────────────────────────────────────────

const DATA_FILE = path.resolve(__dirname, 'bee1.json');
const config: Config = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const { frontendUrl: BASE_URL, account } = config;

// ─── Auth state (module-level, populated once in beforeAll) ───────────────────

let sessionToken = '';
let userId = '';

async function loginAndCaptureSession(browser: Browser): Promise<void> {
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(BASE_URL);
  await page.getByPlaceholder('Enter your username').fill(account.username);
  await page.getByPlaceholder('Enter your password').fill(account.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 });

  sessionToken = (await page.evaluate(() => localStorage.getItem('session_token'))) ?? '';
  userId       = (await page.evaluate(() => localStorage.getItem('user_id')))       ?? '';

  if (!sessionToken) throw new Error('Login succeeded but session_token was not found in localStorage');

  await ctx.close();
}

/** Inject saved auth tokens before any page navigation. */
async function applyAuthToPage(page: Page): Promise<void> {
  await page.addInitScript(
    ({ token, uid }: { token: string; uid: string }) => {
      localStorage.setItem('session_token', token);
      localStorage.setItem('user_id',       uid);
    },
    { token: sessionToken, uid: userId },
  );
}

// ─── Quiz creation helpers ────────────────────────────────────────────────────

async function createQuiz(page: Page, quiz: QuizData): Promise<void> {
  await page.goto(`${BASE_URL}/quiz`);
  await page.getByTestId('create-quiz-fab').click();
  await page.waitForURL(`${BASE_URL}/quiz/new`, { timeout: 10_000 });

  // Title (required)
  await page.getByTestId('quiz-title-input').fill(quiz.title);

  // Description
  if (quiz.description) {
    await page.getByTestId('quiz-description-input').fill(quiz.description);
  }

  // Visibility
  const visibilityTestId = quiz.visibility === 'public'
    ? 'quiz-visibility-public'
    : 'quiz-visibility-private';
  await page.getByTestId(visibilityTestId).check();

  // Tags
  if (quiz.tags && quiz.tags.length > 0) {
    const tagSelector = page.getByTestId('tag-selector');
    await tagSelector.click();
    const tagInput = tagSelector.locator('input');
    for (const tag of quiz.tags) {
      await tagInput.fill(tag);
      await tagInput.press('Enter');
    }
    // Click title input to close the dropdown — Escape would submit/close the form
    await page.getByTestId('quiz-title-input').click();
  }

  await page.getByTestId('quiz-submit-button').click();

  // Wait for redirect to quiz detail page  /quiz/{id}
  await page.waitForURL(/\/quiz\/\d+$/, { timeout: 10_000 });
  await expect(page.getByTestId('quiz-title')).toHaveText(quiz.title);
}

// ─── Question modal helpers ────────────────────────────────────────────────────

async function openQuestionModal(page: Page): Promise<Locator> {
  await page.getByTestId('add-question-button').click();
  const modal = page.getByTestId('question-form-modal');
  await expect(modal).toBeVisible({ timeout: 8_000 });
  return modal;
}

async function fillQuestionCommonFields(modal: Locator, page: Page, q: QuestionData): Promise<void> {
  // Title
  await modal.getByTestId('question-title').fill(q.title);

  // Type — the dropdown option is outside the modal (rendered in a portal)
  await modal.getByTestId('question-type-select').click();
  await page.getByTestId(`option-${q.type}`).click();

  // Explanation
  if (q.explanation) {
    await modal.getByTestId('question-explanation').fill(q.explanation);
  }

  // Tags inside the modal
  if (q.tags && q.tags.length > 0) {
    const tagSelector = modal.getByTestId('tag-selector');
    await tagSelector.click();
    const tagInput = tagSelector.locator('input');
    for (const tag of q.tags) {
      await tagInput.fill(tag);
      await tagInput.press('Enter');
    }
    // Click the title field to close the dropdown — Escape closes the whole modal
    await modal.getByTestId('question-title').click();
  }
}

// ─── Type-specific modal fillers ──────────────────────────────────────────────

async function fillMultipleChoice(modal: Locator, q: QuestionData): Promise<void> {
  const options = q.options ?? [];
  if (options.length === 0) throw new Error(`"${q.title}": options array is empty`);

  // Form starts with 4 blank slots — remove extras if fewer are needed
  for (let i = 3; i >= options.length; i--) {
    const btn = modal.getByTestId(`mc-option-${i}-remove`);
    if (await btn.isVisible()) await btn.click();
  }

  // Add extra slots if more than 4 are needed
  for (let i = 4; i < options.length; i++) {
    await modal.getByTestId('mc-add-option').click();
  }

  for (let i = 0; i < options.length; i++) {
    await modal.getByTestId(`mc-option-${i}-input`).fill(options[i].text);
    if (options[i].correct) {
      await modal.getByTestId(`mc-option-${i}-checkbox`).check();
    }
  }
}

async function fillTrueFalse(modal: Locator, q: QuestionData): Promise<void> {
  const testId = q.answer === true ? 'true-false-true' : 'true-false-false';
  await modal.getByTestId(testId).check();
}

async function fillFillBlank(modal: Locator, q: QuestionData): Promise<void> {
  if (!q.keyword) throw new Error(`"${q.title}": keyword is missing`);
  await modal.getByTestId('fill-blank-keyword').fill(q.keyword);
}

async function fillOrdering(modal: Locator, q: QuestionData): Promise<void> {
  const items = q.items ?? [];
  if (items.length === 0) throw new Error(`"${q.title}": items array is empty`);

  // Remove excess default slots (form starts with 4)
  for (let i = 3; i >= items.length; i--) {
    const btn = modal.getByTestId(`ordering-remove-${i}`);
    if (await btn.isVisible()) await btn.click();
  }

  // Add extra slots if needed
  for (let i = 4; i < items.length; i++) {
    await modal.getByTestId('ordering-add').click();
  }

  for (let i = 0; i < items.length; i++) {
    await modal.getByTestId(`ordering-item-${i}`).fill(items[i]);
  }
}

async function fillMatching(modal: Locator, page: Page, q: QuestionData): Promise<void> {
  const pairs = q.pairs ?? [];
  if (pairs.length === 0) throw new Error(`"${q.title}": pairs array is empty`);

  // The matching component starts with 1 blank pair (not 4 like the standalone form)
  // Add pairs until we have enough slots
  const currentCount = await modal.getByTestId(/^matching-left-\d+$/).count();
  for (let i = currentCount; i < pairs.length; i++) {
    await modal.getByTestId('matching-add').click();
  }

  // Remove any excess slots (shouldn't normally happen but be safe)
  const finalCount = await modal.getByTestId(/^matching-left-\d+$/).count();
  for (let i = finalCount - 1; i >= pairs.length; i--) {
    const btn = modal.getByTestId(`matching-remove-${i}`);
    if (await btn.isVisible()) await btn.click();
  }

  for (let i = 0; i < pairs.length; i++) {
    await modal.getByTestId(`matching-left-${i}`).fill(pairs[i].left);
    await modal.getByTestId(`matching-right-${i}`).fill(pairs[i].right);
  }
}

async function fillTypeSpecificFields(modal: Locator, page: Page, q: QuestionData): Promise<void> {
  switch (q.type) {
    case 'multiple-choice': return fillMultipleChoice(modal, q);
    case 'true-false':      return fillTrueFalse(modal, q);
    case 'fill-blank':      return fillFillBlank(modal, q);
    case 'ordering':        return fillOrdering(modal, q);
    case 'matching':        return fillMatching(modal, page, q);
    default:
      throw new Error(`Unknown question type: ${(q as any).type}`);
  }
}

async function submitModal(modal: Locator): Promise<void> {
  await modal.getByTestId('submit-question').click();
  await expect(modal).not.toBeVisible({ timeout: 10_000 });
}

// ─── Add all questions to the current quiz page ───────────────────────────────

async function addAllQuestions(page: Page, questions: QuestionData[]): Promise<void> {
  for (const [i, q] of questions.entries()) {
    const label = `[${i + 1}/${questions.length}] ${q.type}`;
    console.log(`    ➕  Adding question ${label}: "${q.title}"`);

    const modal = await openQuestionModal(page);
    await fillQuestionCommonFields(modal, page, q);
    await fillTypeSpecificFields(modal, page, q);
    await submitModal(modal);

    // Verify the question content appears somewhere on the page
    const qItem = page.locator(`div:has-text("${q.title}")`).first();
    await expect(qItem).toBeVisible({ timeout: 8_000 });
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

// Serial mode: one quiz at a time — no concurrent session conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Bulk quiz generator from data_quiz.json', () => {

  // Login once; store tokens in module-level variables
  test.beforeAll(async ({ browser }) => {
    await loginAndCaptureSession(browser);
  });

  for (const [index, quiz] of config.quizzes.entries()) {
    const q     = quiz; // capture for closure
    const label = `[${index + 1}/${config.quizzes.length}] "${q.title}" (${q.questions.length} questions)`;

    test(label, async ({ page }) => {
      // Scale timeout: 30s base for quiz creation + 20s per question
      // This ensures even large quizzes never hit the default 30s ceiling
      test.setTimeout(30_000 + q.questions.length * 20_000);
      // Inject auth tokens before any navigation
      await applyAuthToPage(page);

      // ── Step 1: Create the quiz ──────────────────────────────────────────
      console.log(`\n📋  Creating quiz: "${q.title}"`);
      await createQuiz(page, q);

      // ── Step 2: Add all questions ────────────────────────────────────────
      await addAllQuestions(page, q.questions);

      // ── Step 3: Verify total question count ──────────────────────────────
      // The QuestionsSection shows "Total: N" in a <span>
      const totalSpan = page.locator('span.font-medium', { hasText: /^Total:/ });
      await expect(totalSpan).toHaveText(`Total: ${q.questions.length}`, { timeout: 8_000 });

      console.log(`✅  Quiz created: "${q.title}" with ${q.questions.length} questions`);
    });
  }
});