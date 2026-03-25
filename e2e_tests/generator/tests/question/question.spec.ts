/**
 * generate_questions.spec.ts
 *
 * Reads `data1.json` (located next to this file) and creates every question
 * listed there using the configured account.
 *
 * To change questions   → edit "questions" array in data1.json
 * To change account     → edit "account" block in data1.json
 * To change the app URL → edit "frontendUrl" in data1.json
 *
 * Supported question types:
 *   multiple-choice | true-false | fill-blank | ordering | matching
 */

import { test, expect, Page, Browser } from '@playwright/test';
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
  options?: McOption[];   // multiple-choice
  answer?: boolean;       // true-false
  keyword?: string;       // fill-blank
  items?: string[];       // ordering
  pairs?: MatchingPair[]; // matching
}

interface Config {
  account: { username: string; password: string };
  frontendUrl: string;
  questions: QuestionData[];
}

// ─── Load config ──────────────────────────────────────────────────────────────

const DATA_FILE = path.resolve(__dirname, 'data1.json');
const config: Config = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const { frontendUrl: BASE_URL, account } = config;

// ─── Auth state (module-level, shared across all serial tests) ────────────────
// We store the raw localStorage values from the login response so we can
// inject them into every test page without logging in again.

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

  // Read the tokens the auth store wrote to localStorage
  sessionToken = (await page.evaluate(() => localStorage.getItem('session_token'))) ?? '';
  userId       = (await page.evaluate(() => localStorage.getItem('user_id')))       ?? '';

  if (!sessionToken) throw new Error('Login succeeded but session_token was not found in localStorage');

  await ctx.close();
}

/**
 * Inject the captured auth tokens into a page before any navigation.
 * addInitScript runs before every page.goto(), so the app sees a logged-in
 * user from the very first load.
 */
async function applyAuthToPage(page: Page): Promise<void> {
  await page.addInitScript(
    ({ token, uid }: { token: string; uid: string }) => {
      localStorage.setItem('session_token', token);
      localStorage.setItem('user_id',       uid);
    },
    { token: sessionToken, uid: userId },
  );
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

async function goToCreateQuestion(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/questions`);
  await page.getByTestId('create-question').click();
  await page.waitForURL(`${BASE_URL}/question/new`, { timeout: 10_000 });
}

// ─── Common field filler ──────────────────────────────────────────────────────

async function fillCommonFields(page: Page, q: QuestionData): Promise<void> {
  await page.getByTestId('question-title').fill(q.title);

  if (q.description) {
    await page.getByTestId('question-description').fill(q.description);
  }

  await page.getByTestId('question-type-select').click();
  await page.getByTestId(`option-${q.type}`).click();

  if (q.explanation) {
    await page.getByTestId('question-explanation').fill(q.explanation);
  }

  if (q.tags && q.tags.length > 0) {
    const tagSelector = page.getByTestId('tag-selector');
    await tagSelector.click();
    const tagInput = tagSelector.locator('input');
    for (const tag of q.tags) {
      await tagInput.fill(tag);
      await tagInput.press('Enter');
    }
    await tagInput.press('Escape');
  }
}

// ─── Type-specific fillers ────────────────────────────────────────────────────

async function fillMultipleChoice(page: Page, q: QuestionData): Promise<void> {
  const options = q.options ?? [];
  if (options.length === 0) throw new Error(`"${q.title}": options array is empty`);

  // Form starts with 4 blank slots — remove extras if we need fewer
  for (let i = 3; i >= options.length; i--) {
    const btn = page.getByTestId(`mc-option-${i}-remove`);
    if (await btn.isVisible()) await btn.click();
  }

  // Add more slots if we need more than 4
  for (let i = 4; i < options.length; i++) {
    await page.getByTestId('mc-add-option').click();
  }

  for (let i = 0; i < options.length; i++) {
    await page.getByTestId(`mc-option-${i}-input`).fill(options[i].text);
    if (options[i].correct) {
      await page.getByTestId(`mc-option-${i}-checkbox`).check();
    }
  }
}

async function fillTrueFalse(page: Page, q: QuestionData): Promise<void> {
  const testId = q.answer === true ? 'true-false-true' : 'true-false-false';
  await page.getByTestId(testId).check();
}

async function fillFillBlank(page: Page, q: QuestionData): Promise<void> {
  if (!q.keyword) throw new Error(`"${q.title}": keyword is missing`);
  await page.getByTestId('fill-blank-keyword').fill(q.keyword);
}

async function fillOrdering(page: Page, q: QuestionData): Promise<void> {
  const items = q.items ?? [];
  if (items.length === 0) throw new Error(`"${q.title}": items array is empty`);

  // Remove excess default slots (form starts with 4)
  for (let i = 3; i >= items.length; i--) {
    const btn = page.getByTestId(`ordering-remove-${i}`);
    if (await btn.isVisible()) await btn.click();
  }

  for (let i = 4; i < items.length; i++) {
    await page.getByTestId('ordering-add').click();
  }

  for (let i = 0; i < items.length; i++) {
    await page.getByTestId(`ordering-item-${i}`).fill(items[i]);
  }
}

async function fillMatching(page: Page, q: QuestionData): Promise<void> {
  const pairs = q.pairs ?? [];
  if (pairs.length === 0) throw new Error(`"${q.title}": pairs array is empty`);

  // Remove excess default slots (form starts with 4)
  for (let i = 3; i >= pairs.length; i--) {
    const btn = page.getByTestId(`matching-remove-${i}`);
    if (await btn.isVisible()) await btn.click();
  }

  for (let i = 4; i < pairs.length; i++) {
    await page.getByTestId('matching-add').click();
  }

  for (let i = 0; i < pairs.length; i++) {
    await page.getByTestId(`matching-left-${i}`).fill(pairs[i].left);
    await page.getByTestId(`matching-right-${i}`).fill(pairs[i].right);
  }
}

async function fillTypeSpecificFields(page: Page, q: QuestionData): Promise<void> {
  switch (q.type) {
    case 'multiple-choice': return fillMultipleChoice(page, q);
    case 'true-false':      return fillTrueFalse(page, q);
    case 'fill-blank':      return fillFillBlank(page, q);
    case 'ordering':        return fillOrdering(page, q);
    case 'matching':        return fillMatching(page, q);
    default:
      throw new Error(`Unknown question type: ${(q as any).type}`);
  }
}

// ─── Submit + verify ──────────────────────────────────────────────────────────

async function submitAndVerify(page: Page, q: QuestionData): Promise<void> {
  await page.getByTestId('submit-question').click();
  await page.waitForURL(`${BASE_URL}/questions`, { timeout: 10_000 });

  const searchInput = page.getByTestId('question-search');
  await searchInput.fill(q.title);
  await searchInput.press('Enter');

  const item = page
    .locator(`li[data-testid^="question-item-"]:has-text("${q.title}")`)
    .first();
  await expect(item).toBeVisible({ timeout: 8_000 });
}

// ─── Test suite ───────────────────────────────────────────────────────────────

// Serial mode: one test at a time — no concurrent login conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Bulk question generator from data1.json', () => {

  // Login once; store the session token in module-level variables
  test.beforeAll(async ({ browser }) => {
    await loginAndCaptureSession(browser);
  });

  for (const [index, question] of config.questions.entries()) {
    const q     = question;
    const label = `[${index + 1}/${config.questions.length}] ${q.type} – ${q.title}`;

    test(label, async ({ page }) => {
      // Inject the captured token before any navigation — no login form needed
      await applyAuthToPage(page);

      await goToCreateQuestion(page);
      await fillCommonFields(page, q);
      await fillTypeSpecificFields(page, q);
      await submitAndVerify(page, q);

      console.log(`✅  Created: "${q.title}"`);
    });
  }
});