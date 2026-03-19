import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  loginAsAdmin,
  createTestUser,
  deleteTestUser,
  loginAsTestUser,
  authHeaders,
  createQuiz,
  addQuestionToQuiz,
  createQuizAttempt,
  deleteQuiz,
  createQuestion,
  deleteQuestion,
  createSource,
  deleteSource,
  createFavorite,
  deleteFavorite,
} from "./helpers.js";

test.describe("Dashboard API", () => {
  let adminToken;
  let testUser;
  let userToken;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAsAdmin(request);
    testUser = await createTestUser(request);
    userToken = await loginAsTestUser(
      request,
      testUser.username,
      testUser.password,
    );
  });

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, adminToken, testUser.id);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Word of the Day
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("GET /dashboard/word-of-the-day", () => {
    test("returns 200 and a valid word object", async ({ request }) => {
      const res = await request.get(
        `${API_BASE_URL}/dashboard/word-of-the-day`,
        {
          headers: authHeaders(userToken),
        },
      );
      expect(res.status()).toBe(200);
      const word = await res.json();

      expect(word).toHaveProperty("word");
      expect(word.word).toBeTruthy();
      expect(word).toHaveProperty("partOfSpeech");
      expect(word).toHaveProperty("vietnameseTranslation");
      expect(word).toHaveProperty("example");
    });

    test("returns 401 when not authenticated", async ({ request }) => {
      const res = await request.get(
        `${API_BASE_URL}/dashboard/word-of-the-day`,
      );
      expect(res.status()).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Top Quizzes
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("GET /dashboard/top-quizzes", () => {
    const createdQuizIds = [];

    test.afterEach(async ({ request }) => {
      for (const id of createdQuizIds) {
        await deleteQuiz(request, userToken, id);
      }
      createdQuizIds.length = 0;
    });

    test("returns top quizzes ordered by attempt count", async ({
      request,
    }) => {
      const testPrefix = `top-quiz-test-${Date.now()}`;

      const q1 = await createQuiz(
        request,
        userToken,
        `${testPrefix} Quiz 1`,
        testPrefix,
      );
      const q2 = await createQuiz(
        request,
        userToken,
        `${testPrefix} Quiz 2`,
        testPrefix,
      );
      const q3 = await createQuiz(
        request,
        userToken,
        `${testPrefix} Quiz 3`,
        testPrefix,
      );
      createdQuizIds.push(q1.id, q2.id, q3.id);

      await addQuestionToQuiz(request, userToken, q1.id);
      await addQuestionToQuiz(request, userToken, q2.id);
      await addQuestionToQuiz(request, userToken, q3.id);

      await createQuizAttempt(request, userToken, q2.id);
      await createQuizAttempt(request, userToken, q2.id);
      await createQuizAttempt(request, userToken, q1.id);

      const res = await request.get(
        `${API_BASE_URL}/dashboard/top-quizzes?limit=10`,
        {
          headers: authHeaders(userToken),
        },
      );
      expect(res.status()).toBe(200);
      const allQuizzes = await res.json();

      const ourQuizzes = allQuizzes.filter((q) =>
        q.title.startsWith(testPrefix),
      );
      const sorted = [...ourQuizzes].sort(
        (a, b) => b.attemptCount - a.attemptCount,
      );

      expect(sorted[0].id).toBe(q2.id);
      expect(sorted[0].attemptCount).toBe(2);
      expect(sorted[1].id).toBe(q1.id);
      expect(sorted[1].attemptCount).toBe(1);
      expect(sorted[2].id).toBe(q3.id);
      expect(sorted[2].attemptCount).toBe(0);
    });

    test("respects limit parameter (max 20)", async ({ request }) => {
      const testPrefix = `limit-test-${Date.now()}`;
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          createQuiz(request, userToken, `${testPrefix} ${i}`, testPrefix),
        );
      }
      const quizResults = await Promise.all(promises);
      for (const q of quizResults) {
        createdQuizIds.push(q.id);
      }

      const res = await request.get(
        `${API_BASE_URL}/dashboard/top-quizzes?limit=3`,
        {
          headers: authHeaders(userToken),
        },
      );
      expect(res.status()).toBe(200);
      const quizzes = await res.json();
      expect(quizzes.length).toBeLessThanOrEqual(3);
    });

    test("returns 401 when not authenticated", async ({ request }) => {
      const res = await request.get(`${API_BASE_URL}/dashboard/top-quizzes`);
      expect(res.status()).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // User Stats
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("GET /dashboard/user-stats", () => {
    const createdQuizzes = [];
    const createdQuestions = [];
    const createdSources = [];
    const createdFavorites = [];

    test.afterEach(async ({ request }) => {
      for (const id of createdQuizzes) await deleteQuiz(request, userToken, id);
      for (const id of createdQuestions)
        await deleteQuestion(request, userToken, id);
      for (const id of createdSources)
        await deleteSource(request, userToken, id);
      for (const id of createdFavorites)
        await deleteFavorite(request, userToken, id);
      createdQuizzes.length = 0;
      createdQuestions.length = 0;
      createdSources.length = 0;
      createdFavorites.length = 0;
    });

    test("returns correct counts for authenticated user", async ({
      request,
    }) => {
      // Get initial stats
      const initialRes = await request.get(
        `${API_BASE_URL}/dashboard/user-stats`,
        {
          headers: authHeaders(userToken),
        },
      );
      expect(initialRes.status()).toBe(200);
      const initialStats = await initialRes.json();

      // Create items
      const qz1 = await createQuiz(request, userToken);
      const qz2 = await createQuiz(request, userToken);
      createdQuizzes.push(qz1.id, qz2.id);

      const qn1 = await createQuestion(request, userToken);
      const qn2 = await createQuestion(request, userToken);
      createdQuestions.push(qn1.id, qn2.id);

      const src1 = await createSource(request, userToken);
      const src2 = await createSource(request, userToken);
      createdSources.push(src1.id, src2.id);

      const fav1 = await createFavorite(request, userToken, "fav1");
      const fav2 = await createFavorite(request, userToken, "fav2");
      createdFavorites.push(fav1, fav2);

      // Get final stats
      const finalRes = await request.get(
        `${API_BASE_URL}/dashboard/user-stats`,
        {
          headers: authHeaders(userToken),
        },
      );
      expect(finalRes.status()).toBe(200);
      const finalStats = await finalRes.json();

      // Verify differences
      expect(finalStats.quizCount - initialStats.quizCount).toBe(2);
      expect(finalStats.questionCount - initialStats.questionCount).toBe(2);
      expect(finalStats.sourceCount - initialStats.sourceCount).toBe(2);
      expect(finalStats.favoriteCount - initialStats.favoriteCount).toBe(2);
    });

    test("returns 401 when not authenticated", async ({ request }) => {
      const res = await request.get(`${API_BASE_URL}/dashboard/user-stats`);
      expect(res.status()).toBe(401);
    });
  });
});
