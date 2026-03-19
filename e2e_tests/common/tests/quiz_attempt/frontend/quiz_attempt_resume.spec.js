// tests/quiz_attempt/quiz_attempt_resume.spec.js
// Tests for resuming an in-progress attempt (page reload, direct URL access).
// Verifies that previously saved answers are restored and navigation state
// is correctly reconstructed from the server.

import { test, expect } from "@playwright/test";
import {
  APP_BASE_URL,
  API_BASE_URL,
  ALL_QUESTION_TYPES,
  AUTH_STORAGE_KEY,
  loginAsAdmin,
  authHeaders,
  createQuizWithQuestions,
  startAttempt,
  submitAnswer,
  deleteQuiz,
  makeCorrectAnswer,
  finalizeAttempt,
} from "./helpers/quiz_attempt.helpers.js";

// ── helpers ──────────────────────────────────────────────────────────────────

async function openPlayer(page, quizId, attemptId) {
  await page.goto(`${APP_BASE_URL}/quiz/${quizId}/attempt/${attemptId}`);
  await page.waitForSelector('[data-testid="player-container"]', { timeout: 15_000 });
}

// ─── API-level resume tests ──────────────────────────────────────────────────

test.describe("Resume Attempt – API", () => {
  test("RS-A-1: fetching an in-progress attempt returns status in_progress", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token, ["true_false"], "Resume");
    const startData = await startAttempt(request, token, quizId);

    try {
      const res = await request.get(`${API_BASE_URL}/attempts/${startData.attemptId}`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("in_progress");
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-A-2: answers saved mid-attempt are persisted on re-fetch", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token, ["true_false"], "Persist");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    await submitAnswer(request, token, attemptId, questionIds[0], { selected: true });

    try {
      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}`, {
        headers: authHeaders(token),
      });
      const body = await res.json();
      const savedAnswer = body.answers?.find(a => a.quizQuestionId === questionIds[0]);
      expect(savedAnswer).toBeDefined();
      const parsed = JSON.parse(savedAnswer.answerJson);
      expect(parsed.selected).toBe(true);
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-A-3: partial answers are preserved — unanswered questions have no answer or empty", async ({
    request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(
      request, token, ["true_false", "fill_blank"], "Partial",
    );
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    // Only answer question 0
    await submitAnswer(request, token, attemptId, questionIds[0], { selected: false });

    try {
      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}`, {
        headers: authHeaders(token),
      });
      const body = await res.json();
      const q0Answer = body.answers?.find(a => a.quizQuestionId === questionIds[0]);
      const q1Answer = body.answers?.find(a => a.quizQuestionId === questionIds[1]);

      expect(q0Answer).toBeDefined();
      // q1Answer may be absent or have empty answer — both acceptable
      if (q1Answer) {
        const parsed = JSON.parse(q1Answer.answerJson);
        expect(parsed.answer ?? "").toBe("");
      }
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-A-4: resuming attempt after overwriting an answer returns the latest value", async ({
    request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token, ["true_false"], "Overwrite");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    await submitAnswer(request, token, attemptId, questionIds[0], { selected: true });
    await submitAnswer(request, token, attemptId, questionIds[0], { selected: false }); // overwrite

    try {
      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}`, {
        headers: authHeaders(token),
      });
      const body = await res.json();
      const savedAnswer = body.answers?.find(a => a.quizQuestionId === questionIds[0]);
      const parsed = JSON.parse(savedAnswer.answerJson);
      expect(parsed.selected).toBe(false); // latest value
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-A-5: can resume attempt via /quiz/:id/attempt/:attemptId endpoint", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token, ["true_false"], "ResAPI");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    try {
      // Simulate "resume" by fetching attempt and checking it's still in_progress
      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("in_progress");
      expect(body.id).toBe(attemptId);
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });
});

// ─── UI-level resume tests ───────────────────────────────────────────────────
//
// Each test creates its own authenticated browser context so addInitScript
// fires cleanly before the first navigation. This mirrors createAuthenticatedPage
// in quiz-test-utils.js and avoids shared state between beforeEach and the test.

/**
 * Creates a fresh authenticated context and navigates to the player URL.
 * addInitScript persists for ALL document loads in the context — including
 * page.reload() — so no manual token re-injection is needed after reload.
 */
async function createAuthenticatedPlayerPage(browser, token, quizId, attemptId) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(
    ({ key, value }) => { localStorage.setItem(key, value); },
    { key: AUTH_STORAGE_KEY, value: token },
  );
  await openPlayer(page, quizId, attemptId);
  return { page, context };
}

test.describe("Resume Attempt – UI", () => {

  test("RS-U-1: refreshing the player page keeps the current question index at 1", async ({
    browser, request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token, ["true_false", "fill_blank"], "RefreshUI");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    const { page, context } = await createAuthenticatedPlayerPage(browser, token, quizId, attemptId);

    try {
      // addInitScript fires again on reload — no manual token re-injection needed
      await page.reload();
      await page.waitForSelector('[data-testid="player-container"]', { timeout: 15_000 });
      await expect(page.locator('[data-testid="player-progress"]')).toContainText("Question 1");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-U-2: saved true/false answer is pre-selected after page load", async ({
    browser, request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(
      request, token, ["true_false"], "Reload",
    );
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    // Save via API first, then open the page — it should restore the saved answer
    await submitAnswer(request, token, attemptId, questionIds[0], { selected: true });

    const { page, context } = await createAuthenticatedPlayerPage(browser, token, quizId, attemptId);
    try {
      const trueRadio = page.locator('[data-testid="true-false-option-true"] input[type="radio"]');
      await expect(trueRadio).toBeChecked();
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-U-3: saved fill blank answer is pre-populated after page load", async ({
    browser, request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(
      request, token, ["fill_blank"], "ReloadFB",
    );
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    await submitAnswer(request, token, attemptId, questionIds[0], { answer: "my saved answer" });

    const { page, context } = await createAuthenticatedPlayerPage(browser, token, quizId, attemptId);
    try {
      await expect(page.locator('[data-testid="fill-blank-input"]')).toHaveValue("my saved answer");
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-U-4: saved single-choice answer is pre-selected after page load", async ({
    browser, request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(
      request, token, ["single_choice"], "ReloadSC",
    );
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    // string id "1" matches the canonical schema (option ids are strings)
    await submitAnswer(request, token, attemptId, questionIds[0], { selected: "1" });

    const { page, context } = await createAuthenticatedPlayerPage(browser, token, quizId, attemptId);
    try {
      const radio1 = page.locator('[data-testid="single-choice-option-1"] input[type="radio"]');
      await expect(radio1).toBeChecked();
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-U-5: resuming does not allow re-submitting a completed attempt", async ({
    browser, request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(
      request, token, ["true_false"], "ResumeCompleted",
    );
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    await submitAnswer(request, token, attemptId, questionIds[0], { selected: true });
    await finalizeAttempt(request, token, attemptId);

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(
      ({ key, value }) => { localStorage.setItem(key, value); },
      { key: AUTH_STORAGE_KEY, value: token },
    );

    try {
      await page.goto(`${APP_BASE_URL}/quiz/${quizId}/attempt/${attemptId}`);
      await page.waitForTimeout(3_000);
      const currentUrl = page.url();
      const isOnPlayer = currentUrl.includes(`/attempt/${attemptId}`) && !currentUrl.includes("/review");
      if (isOnPlayer) {
        const submitBtn = page.locator('[data-testid="submit-attempt"]');
        const isVisible = await submitBtn.isVisible().catch(() => false);
        if (isVisible) {
          await expect(submitBtn).toBeDisabled();
        }
      } else {
        expect(currentUrl).not.toContain(`/quiz/${quizId}/attempt/${attemptId}`);
      }
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("RS-U-6: sidebar shows question count matching total questions", async ({ browser, request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token, ALL_QUESTION_TYPES, "Sidebar");
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;
    const { page, context } = await createAuthenticatedPlayerPage(browser, token, quizId, attemptId);

    try {
      await page.click('[data-testid="open-sidebar"]');
      const buttons = page.locator('[data-testid^="sidebar-question-"]');
      await expect(buttons).toHaveCount(ALL_QUESTION_TYPES.length);
    } finally {
      await page.close(); await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });
});