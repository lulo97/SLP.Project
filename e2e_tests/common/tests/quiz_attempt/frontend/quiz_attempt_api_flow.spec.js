// tests/quiz_attempt/quiz_attempt_api_flow.spec.js
// Happy-path API tests: start → answer → submit → review.
// Each test creates its own quiz and deletes it on teardown,
// so the suite is fully idempotent and can be run multiple times.

import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  ALL_QUESTION_TYPES,
  BACKEND_QUESTION_TYPES,
  SCORED_TYPES,
  loginAsAdmin,
  authHeaders,
  createQuizWithQuestions,
  startAttempt,
  submitAnswer,
  submitAllCorrectAnswers,
  finalizeAttempt,
  deleteQuiz,
  fullSetup,
  fullTeardown,
  makeCorrectAnswer,
  makeWrongAnswer,
  makeSnapshot,
} from "./helpers/quiz_attempt.helpers.js";

// ─── Suite ──────────────────────────────────────────────────────────────────

test.describe("Quiz Attempt API – Happy Path Flow", () => {
  // ── 1. Login ───────────────────────────────────────────────────────────────
  test("1-1: admin can authenticate and receive a session token", async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: "admin", password: "123" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(typeof body.token).toBe("string");
  });

  // ── 2. Quiz creation ──────────────────────────────────────────────────────
  test("2-1: can create a quiz with one question of every type", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token);

    try {
      expect(quizId).toBeTruthy();
      expect(questionIds).toHaveLength(ALL_QUESTION_TYPES.length);
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── 3. Start attempt ──────────────────────────────────────────────────────
  test("3-1: starting an attempt returns correct shape and question count", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token);

    try {
      const startData = await startAttempt(request, token, quizId);

      expect(startData).toHaveProperty("attemptId");
      expect(startData).toHaveProperty("startTime");
      expect(startData).toHaveProperty("questionCount", ALL_QUESTION_TYPES.length);
      expect(startData).toHaveProperty("maxScore", SCORED_TYPES.length); // flashcard is unscored
      expect(Array.isArray(startData.questions)).toBe(true);
      expect(startData.questions).toHaveLength(ALL_QUESTION_TYPES.length);

      // Each question must carry a snapshot JSON
      for (const q of startData.questions) {
        expect(q).toHaveProperty("quizQuestionId");
        expect(q).toHaveProperty("questionSnapshotJson");
        expect(() => JSON.parse(q.questionSnapshotJson)).not.toThrow();
      }
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  test("3-2: can start multiple attempts on the same quiz", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token);

    try {
      const a1 = await startAttempt(request, token, quizId);
      const a2 = await startAttempt(request, token, quizId);
      expect(a1.attemptId).not.toBe(a2.attemptId);
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── 4. Fetching an attempt ─────────────────────────────────────────────────
  test("4-1: fetching an in-progress attempt returns correct data", async ({ request }) => {
    const { token, quizId, attemptId } = await fullSetup(request);

    try {
      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(attemptId);
      expect(body.status).toBe("in_progress");
      expect(body.score).toBeNull ?? expect(body.score).toBeFalsy();
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  // ── 5. Submitting individual answers ──────────────────────────────────────
  test("5-1: can submit a correct answer for every question type", async ({ request }) => {
    const { token, quizId, questionIds, attemptId } = await fullSetup(request);

    try {
      for (let i = 0; i < ALL_QUESTION_TYPES.length; i++) {
        const res = await submitAnswer(
          request, token, attemptId,
          questionIds[i],
          makeCorrectAnswer(ALL_QUESTION_TYPES[i]),
        );
        expect(res.status()).toBe(200);
      }
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  test("5-2: can overwrite a previously submitted answer", async ({ request }) => {
    const { token, quizId, questionIds, attemptId } = await fullSetup(request);

    try {
      // First answer (wrong)
      const r1 = await submitAnswer(request, token, attemptId, questionIds[0], makeWrongAnswer("multiple_choice"));
      expect(r1.status()).toBe(200);

      // Overwrite with correct answer
      const r2 = await submitAnswer(request, token, attemptId, questionIds[0], makeCorrectAnswer("multiple_choice"));
      expect(r2.status()).toBe(200);
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  // ── 6. Submitting the attempt ─────────────────────────────────────────────
  test("6-1: submitting all correct answers yields maxScore", async ({ request }) => {
    const { token, quizId, questionIds, attemptId } = await fullSetup(request);

    try {
      await submitAllCorrectAnswers(request, token, attemptId, questionIds, ALL_QUESTION_TYPES);
      const { status, body } = await finalizeAttempt(request, token, attemptId);

      expect(status).toBe(200);
      expect(body.status).toBe("completed");
      expect(body.score).toBe(SCORED_TYPES.length);
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  test("6-2: submitting all wrong answers yields score of 0", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId, questionIds } = await createQuizWithQuestions(request, token);
    const startData = await startAttempt(request, token, quizId);
    const attemptId = startData.attemptId;

    try {
      for (let i = 0; i < ALL_QUESTION_TYPES.length; i++) {
        await submitAnswer(
          request, token, attemptId,
          questionIds[i],
          makeWrongAnswer(ALL_QUESTION_TYPES[i]),
        );
      }
      const { status, body } = await finalizeAttempt(request, token, attemptId);
      expect(status).toBe(200);
      expect(body.status).toBe("completed");
      expect(body.score).toBe(0);
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  test("6-3: submitting attempt with no answers yields score of 0", async ({ request }) => {
    const { token, quizId, attemptId } = await fullSetup(request);

    try {
      const { status, body } = await finalizeAttempt(request, token, attemptId);
      expect(status).toBe(200);
      expect(body.status).toBe("completed");
      expect(body.score).toBe(0);
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  test("6-4: flashcard is accepted by backend but not counted toward maxScore", async ({ request }) => {
    // flashcard is a valid backend type but IsFlashcard() in AttemptService makes it unscored.
    // A quiz with all 7 types must have maxScore = SCORED_TYPES.length (not ALL_QUESTION_TYPES.length).
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token, ALL_QUESTION_TYPES, "Scored");
    const startData = await startAttempt(request, token, quizId);

    try {
      expect(startData.questionCount).toBe(ALL_QUESTION_TYPES.length);     // 7 questions
      expect(startData.maxScore).toBe(SCORED_TYPES.length);                // 6 scored (no flashcard)
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── 7. Review ─────────────────────────────────────────────────────────────
  test("7-1: review returns correct shape after all-correct submission", async ({ request }) => {
    const { token, quizId, questionIds, quizTitle, attemptId } = await fullSetup(request);

    try {
      await submitAllCorrectAnswers(request, token, attemptId, questionIds, ALL_QUESTION_TYPES);
      await finalizeAttempt(request, token, attemptId);

      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}/review`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(200);
      const review = await res.json();

      expect(review.quizTitle).toBe(quizTitle);
      expect(review.score).toBe(SCORED_TYPES.length);       // flashcard doesn't count
      expect(review.maxScore).toBe(SCORED_TYPES.length);
      expect(Array.isArray(review.answerReview)).toBe(true);
      expect(review.answerReview).toHaveLength(ALL_QUESTION_TYPES.length); // all 7 rows present

      const correctCount = review.answerReview.filter(a => a.isCorrect).length;
      expect(correctCount).toBe(SCORED_TYPES.length); // flashcard row has isCorrect = false
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  test("7-2: all-correct submission marks every scored question correct and flashcard as not-correct", async ({ request }) => {
    const { token, quizId, questionIds, attemptId } = await fullSetup(request);

    try {
      await submitAllCorrectAnswers(request, token, attemptId, questionIds, ALL_QUESTION_TYPES);
      await finalizeAttempt(request, token, attemptId);

      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}/review`, {
        headers: authHeaders(token),
      });
      const review = await res.json();

      // Separate flashcard rows from scored rows
      const scoredRows = review.answerReview.filter(a => {
        const snap = JSON.parse(a.questionSnapshotJson);
        return snap.type !== "flashcard";
      });
      const flashcardRows = review.answerReview.filter(a => {
        const snap = JSON.parse(a.questionSnapshotJson);
        return snap.type === "flashcard";
      });

      // Every scored question must be correct
      expect(scoredRows.every(a => a.isCorrect === true)).toBe(true);
      expect(scoredRows).toHaveLength(SCORED_TYPES.length);

      // Flashcard is never correct — backend sets isCorrect = null, serialized as false in DTO
      expect(flashcardRows).toHaveLength(1);
      expect(flashcardRows[0].isCorrect).toBeFalsy();
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  test("7-3: review contains questionSnapshotJson and answerJson for each row", async ({ request }) => {
    const { token, quizId, questionIds, attemptId } = await fullSetup(request);

    try {
      await submitAllCorrectAnswers(request, token, attemptId, questionIds, ALL_QUESTION_TYPES);
      await finalizeAttempt(request, token, attemptId);

      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}/review`, {
        headers: authHeaders(token),
      });
      const review = await res.json();

      for (const row of review.answerReview) {
        expect(row).toHaveProperty("questionSnapshotJson");
        expect(row).toHaveProperty("answerJson");
        expect(() => JSON.parse(row.questionSnapshotJson)).not.toThrow();
      }
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  // ── 8. User attempts list ─────────────────────────────────────────────────
  test("8-1: user attempts list returns all attempts for a quiz", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token);

    try {
      const a1 = await startAttempt(request, token, quizId);
      const a2 = await startAttempt(request, token, quizId);
      await finalizeAttempt(request, token, a1.attemptId);
      await finalizeAttempt(request, token, a2.attemptId);

      const res = await request.get(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(200);
      const list = await res.json();
      expect(list.length).toBeGreaterThanOrEqual(2);
      const ids = list.map(a => a.id);
      expect(ids).toContain(a1.attemptId);
      expect(ids).toContain(a2.attemptId);
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  test("8-2: newly created quiz has 0 user attempts", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token);

    try {
      const res = await request.get(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(200);
      const list = await res.json();
      expect(list).toHaveLength(0);
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });
});