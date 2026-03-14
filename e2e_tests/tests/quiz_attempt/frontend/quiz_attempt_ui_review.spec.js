// tests/quiz_attempt/quiz_attempt_ui_review.spec.js
// UI tests for the AttemptReview page.
// Each test creates a quiz, runs a full attempt, then verifies review UI.

import { test, expect } from "@playwright/test";
import {
  APP_BASE_URL,
  AUTH_STORAGE_KEY,
  ALL_QUESTION_TYPES,
  SCORED_TYPES,
  loginAsAdmin,
  createQuizWithQuestions,
  startAttempt,
  submitAllCorrectAnswers,
  finalizeAttempt,
  deleteQuiz,
  makeCorrectAnswer,
  makeWrongAnswer,
  submitAnswer,
} from "./helpers/quiz_attempt.helpers.js";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates an authenticated page and navigates directly to the review URL.
 * Fresh context per call so addInitScript fires before the first navigation.
 */
async function createReviewPage(browser, token, attemptId) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(
    ({ key, value }) => { localStorage.setItem(key, value); },
    { key: AUTH_STORAGE_KEY, value: token },
  );
  await page.goto(`${APP_BASE_URL}/quiz/attempt/${attemptId}/review`);
  await page.waitForSelector('[data-testid="review-container"]', { timeout: 15_000 });
  return { page, context };
}

/**
 * Creates a complete all-correct attempt and returns { token, quizId, attemptId }.
 */
async function setupCompletedAttempt(request, types = ALL_QUESTION_TYPES, label = "Review") {
  const token = await loginAsAdmin(request);
  const { quizId, questionIds, quizTitle } = await createQuizWithQuestions(request, token, types, label);
  const startData = await startAttempt(request, token, quizId);
  const attemptId = startData.attemptId;
  await submitAllCorrectAnswers(request, token, attemptId, questionIds, types);
  await finalizeAttempt(request, token, attemptId);
  return { token, quizId, questionIds, quizTitle, attemptId };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

test.describe("AttemptReview UI", () => {
  // No shared beforeEach — each test creates its own authenticated context.

  // ── Score card ─────────────────────────────────────────────────────────────

  test("R-1: score card shows correct score and maxScore", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="score-value"]')).toContainText(
        String(SCORED_TYPES.length),
      );
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-2: score percentage is displayed", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="score-percent"]')).toContainText("%");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-3: correct-count and incorrect-count are displayed", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="correct-count"]')).toContainText(
        `${SCORED_TYPES.length} correct`,
      );
      await expect(page.locator('[data-testid="incorrect-count"]')).toContainText("0 incorrect");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-4: score progress bar is rendered", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="score-progress-bar"]')).toBeVisible();
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-5: completion time is displayed", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="completed-time"]')).toContainText("Completed");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── Question cards ─────────────────────────────────────────────────────────

  test("R-6: review renders one card per question", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid^="review-question-"]')).toHaveCount(ALL_QUESTION_TYPES.length);
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-7: all-correct attempt marks every scored question as correct", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      for (let i = 0; i < SCORED_TYPES.length; i++) {
        await expect(page.locator(`[data-testid="review-question-result-${i}"]`)).toContainText("Correct");
      }
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-8: all-wrong attempt shows every scored question as incorrect", async ({ browser, request }) => {
    const token = await loginAsAdmin(request);
    const types = ["true_false", "single_choice"];
    const { quizId, questionIds } = await createQuizWithQuestions(request, token, types, "AllWrong");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    for (let i = 0; i < types.length; i++) {
      await submitAnswer(request, token, attemptId, questionIds[i], makeWrongAnswer(types[i]));
    }
    await finalizeAttempt(request, token, attemptId);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      for (let i = 0; i < types.length; i++) {
        await expect(page.locator(`[data-testid="review-question-result-${i}"]`)).toContainText("Incorrect");
      }
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-9: incorrect question card shows both user answer and correct answer sections", async ({ browser, request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token, ["true_false"], "WrongOne");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    await submitAnswer(request, token, attemptId, questionIds[0], makeWrongAnswer("true_false"));
    await finalizeAttempt(request, token, attemptId);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="review-user-answer-0"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-correct-answer-0"]')).toBeVisible();
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-10: correct question card shows only user answer section", async ({ browser, request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token, ["true_false"], "CorrectOne");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    await submitAnswer(request, token, attemptId, questionIds[0], makeCorrectAnswer("true_false"));
    await finalizeAttempt(request, token, attemptId);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="review-user-answer-0"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-correct-answer-0"]')).not.toBeVisible();
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-11: explanation is shown when present", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request, ["true_false"], "Expl");
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="review-explanation-0"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-explanation-0"]')).toContainText("Explanation");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-12: question type badge is displayed for each card", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request, ["true_false", "fill_blank"]);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="review-question-type-0"]')).toContainText("true false");
      await expect(page.locator('[data-testid="review-question-type-1"]')).toContainText("fill blank");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── AnswerDisplay content ──────────────────────────────────────────────────

  test("R-13: true/false answer shows True or False text", async ({ browser, request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token, ["true_false"], "TF");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    await submitAnswer(request, token, attemptId, questionIds[0], { selected: true });
    await finalizeAttempt(request, token, attemptId);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="answer-display-true-false"]').first()).toContainText("True");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-14: fill blank answer shows the user's text", async ({ browser, request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token, ["fill_blank"], "FB");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    await submitAnswer(request, token, attemptId, questionIds[0], { answer: "correct answer" });
    await finalizeAttempt(request, token, attemptId);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="answer-display-fill-blank"]').first()).toContainText("correct answer");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-15: no-answer question shows empty state", async ({ browser, request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token, ["true_false"], "Empty");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    await finalizeAttempt(request, token, attemptId);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="answer-display-empty"]').first()).toBeVisible();
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── Back to quiz ───────────────────────────────────────────────────────────

  test("R-16: Back to Quiz button navigates away from review", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request, ["true_false"], "Back");
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await page.click('[data-testid="back-to-quiz"]');
      await page.waitForURL(/\/quiz\/\d+/, { timeout: 8_000 });
      expect(page.url()).toContain(`/quiz/${quizId}`);
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── Review-not-found ───────────────────────────────────────────────────────

  test("R-17: navigating to non-existent review shows not-found message", async ({ browser, request }) => {
    // Needs auth so the app doesn't redirect to /login before showing 404 content
    const token = await loginAsAdmin(request);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(
      ({ key, value }) => { localStorage.setItem(key, value); },
      { key: AUTH_STORAGE_KEY, value: token },
    );
    await page.goto(`${APP_BASE_URL}/quiz/attempt/999999999/review`);
    try {
      await page.waitForSelector('[data-testid="review-not-found"]', { timeout: 10_000 });
      await expect(page.locator('[data-testid="review-not-found"]')).toBeVisible();
    } finally {
      await page.close(); await context.close();
    }
  });

  // ── Score color thresholds ─────────────────────────────────────────────────

  test("R-18: score of 100% shows green text class", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await setupCompletedAttempt(request, ["true_false"], "Green");
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="score-value"]')).toHaveClass(/text-green/);
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("R-19: score of 0% shows red text class", async ({ browser, request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token, ["true_false"], "Red");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    await submitAnswer(request, token, attemptId, questionIds[0], makeWrongAnswer("true_false"));
    await finalizeAttempt(request, token, attemptId);
    const { page, context } = await createReviewPage(browser, token, attemptId);
    try {
      await expect(page.locator('[data-testid="score-value"]')).toHaveClass(/text-red/);
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });
});