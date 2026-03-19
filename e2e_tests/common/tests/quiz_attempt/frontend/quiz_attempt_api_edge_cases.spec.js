// tests/quiz_attempt/quiz_attempt_api_edge_cases.spec.js
// All API-level edge cases: auth, disabled quiz, invalid ids, duplicate submit, etc.

import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  ALL_QUESTION_TYPES,
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
} from "./helpers/quiz_attempt.helpers.js";

test.describe("Quiz Attempt API – Edge Cases", () => {

  // ── Auth ───────────────────────────────────────────────────────────────────
  test("EC-1: unauthenticated request to fetch attempt returns 401", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/attempts/1`);
    expect(res.status()).toBe(401);
  });

  test("EC-2: invalid token returns 401", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/attempts/1`, {
      headers: { "X-Session-Token": "totally-invalid-token" },
    });
    expect(res.status()).toBe(401);
  });

  test("EC-3: unauthenticated attempt start returns 401", async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/quizzes/1/attempts`);
    expect(res.status()).toBe(401);
  });

  // ── Non-existent resources ────────────────────────────────────────────────
  test("EC-4: fetching non-existent attempt returns 404", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const res = await request.get(`${API_BASE_URL}/attempts/999999999`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(404);
  });

  test("EC-5: fetching review of non-existent attempt returns 404", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const res = await request.get(`${API_BASE_URL}/attempts/999999999/review`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(404);
  });

  test("EC-6: starting attempt on non-existent quiz returns 400", async ({ request }) => {
    // Backend validates quiz existence and returns 400 (not 404) for unknown quiz ids.
    const token = await loginAsAdmin(request);
    const res = await request.post(`${API_BASE_URL}/quizzes/999999999/attempts`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(400);
  });

  // ── Disabled quiz ─────────────────────────────────────────────────────────
  test("EC-7: starting attempt on disabled quiz returns 400", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token);

    try {
      // Disable quiz
      const disableRes = await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
        headers: authHeaders(token),
        data: { disabled: true },
      });
      expect(disableRes.status()).toBe(200);

      // Attempt should fail
      const res = await request.post(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(400);
    } finally {
      // Re-enable before delete
      await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
        headers: authHeaders(token),
        data: { disabled: false },
      });
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── Submitting after completion ───────────────────────────────────────────
  test("EC-8: submitting an answer on a completed attempt returns 400", async ({ request }) => {
    const { token, quizId, questionIds, attemptId } = await fullSetup(request);

    try {
      await submitAllCorrectAnswers(request, token, attemptId, questionIds, ALL_QUESTION_TYPES);
      await finalizeAttempt(request, token, attemptId);

      // Try to add another answer after submit
      const res = await submitAnswer(
        request, token, attemptId,
        questionIds[0],
        makeCorrectAnswer("multiple_choice"),
      );
      expect(res.status()).toBe(400);
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  test("EC-9: submitting the attempt a second time returns 400", async ({ request }) => {
    const { token, quizId, attemptId } = await fullSetup(request);

    try {
      await finalizeAttempt(request, token, attemptId);
      const { status } = await finalizeAttempt(request, token, attemptId);
      expect(status).toBe(400);
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  // ── Review on in-progress attempt ─────────────────────────────────────────
  test("EC-10: fetching review of an in-progress attempt returns 400", async ({ request }) => {
    const { token, quizId, attemptId } = await fullSetup(request);

    try {
      const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}/review`, {
        headers: authHeaders(token),
      });
      // Expect 400 (not completed) or 404 depending on implementation
      expect([400, 404]).toContain(res.status());
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  // ── Answer for wrong quiz question ───────────────────────────────────────
  test("EC-11: submitting answer for a quizQuestionId not in this attempt returns 400 or 404", async ({ request }) => {
    const { token, quizId, attemptId } = await fullSetup(request);

    try {
      const res = await submitAnswer(request, token, attemptId, 999999999, { selected: [0] });
      expect([400, 404]).toContain(res.status());
    } finally {
      await fullTeardown(request, token, quizId);
    }
  });

  // ── Cascade delete ────────────────────────────────────────────────────────
  test("EC-12: deleting a quiz removes all its attempts (cascade)", async ({ request }) => {
    const { token, quizId, attemptId } = await fullSetup(request);

    // Don't call fullTeardown — manually delete quiz and verify cascade
    await deleteQuiz(request, token, quizId);

    const res = await request.get(`${API_BASE_URL}/attempts/${attemptId}`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(404);
  });

  // ── Re-enabling quiz ──────────────────────────────────────────────────────
  test("EC-13: re-enabled quiz can accept new attempts", async ({ request }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(request, token);

    try {
      await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
        headers: authHeaders(token),
        data: { disabled: true },
      });
      await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
        headers: authHeaders(token),
        data: { disabled: false },
      });

      const res = await request.post(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(200);
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── Per-type answer validation ─────────────────────────────────────────────
  for (const type of ALL_QUESTION_TYPES) {
    test(`EC-14-${type}: correct answer payload for ${type} is accepted (200)`, async ({ request }) => {
      const token = await loginAsAdmin(request);
      const { quizId, questionIds } = await createQuizWithQuestions(request, token, [type], type);
      const startData = await startAttempt(request, token, quizId);

      try {
        const res = await submitAnswer(
          request, token, startData.attemptId,
          questionIds[0],
          makeCorrectAnswer(type),
        );
        expect(res.status()).toBe(200);
      } finally {
        await deleteQuiz(request, token, quizId);
      }
    });
  }

  // ── Empty quiz ─────────────────────────────────────────────────────────────
  test("EC-15: starting attempt on quiz with 0 questions succeeds (returns 200)", async ({ request }) => {
    // The backend allows starting an attempt on an empty quiz.
    // This test documents the actual behaviour: 200 with an empty questions array.
    const token = await loginAsAdmin(request);
    const quizData = {
      title: `[PW] Empty Quiz ${Date.now()}`,
      description: "Empty quiz for testing",
      visibility: "private",
      tagNames: [],
    };
    const createRes = await request.post(`${API_BASE_URL}/quiz`, {
      headers: authHeaders(token),
      data: quizData,
    });
    expect(createRes.status()).toBe(201);
    const quiz = await createRes.json();

    try {
      const startRes = await request.post(`${API_BASE_URL}/quizzes/${quiz.id}/attempts`, {
        headers: authHeaders(token),
      });
      // Backend returns 200 and creates an attempt with questionCount = 0
      expect(startRes.status()).toBe(200);
      const body = await startRes.json();
      expect(body.questionCount).toBe(0);
      expect(body.questions).toHaveLength(0);
    } finally {
      await deleteQuiz(request, token, quiz.id);
    }
  });
});