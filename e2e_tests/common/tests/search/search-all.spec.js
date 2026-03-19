import { test, expect } from "@playwright/test";
import {
  login,
  unique,
  searchApi,
  createQuiz,
  deleteQuiz,
  createQuestion,
  deleteQuestion,
  createSource,
  deleteSource,
  createFavorite,
  deleteFavorite,
} from "./helpers.js";

const RESULT_TYPES = ["quiz", "question", "source", "favorite"];

test.describe("Search – All-type (type=all)", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("should return results from multiple categories in a single response", async ({
    request,
  }) => {
    const seed = unique("AllMode");

    const quiz     = await createQuiz(request, token, { title: `${seed} quiz` });
    const question = await createQuestion(request, token, {
      content: `${seed} question content`,
    });
    const fav      = await createFavorite(request, token, {
      text: `${seed} favorite`,
    });

    const { body } = await searchApi(request, token, { q: seed, type: "all" });

    const types = new Set(body.results.map((r) => r.resultType));
    expect(types.size).toBeGreaterThanOrEqual(2);

    await deleteQuiz(request, token, quiz.id);
    await deleteQuestion(request, token, question.id);
    await deleteFavorite(request, token, fav.id);
  });

  test("categoryCounts should reflect per-category match totals", async ({
    request,
  }) => {
    const seed = unique("CatCount");

    const quiz     = await createQuiz(request, token, { title: `${seed} quiz` });
    const question = await createQuestion(request, token, {
      content: `${seed} question content`,
    });

    const { body } = await searchApi(request, token, { q: seed, type: "all" });

    expect(body.categoryCounts.quizzes).toBeGreaterThanOrEqual(1);
    expect(body.categoryCounts.questions).toBeGreaterThanOrEqual(1);
    expect(typeof body.categoryCounts.sources).toBe("number");
    expect(typeof body.categoryCounts.favorites).toBe("number");

    await deleteQuiz(request, token, quiz.id);
    await deleteQuestion(request, token, question.id);
  });

  test("totalCount should equal the sum of all categoryCounts", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, { q: "test", type: "all" });

    const expectedTotal =
      body.categoryCounts.quizzes +
      body.categoryCounts.questions +
      body.categoryCounts.sources +
      body.categoryCounts.favorites;

    expect(body.totalCount).toBe(expectedTotal);
  });

  test("results in all mode should be ordered by rank descending", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, { q: "test", type: "all" });

    const ranks = body.results.map((r) => r.rank);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
    }
  });

  test("each result in all mode should have a valid resultType", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, { q: "test", type: "all" });

    for (const item of body.results) {
      expect(RESULT_TYPES).toContain(item.resultType);
    }
  });

  test("categoryCounts object should have all four expected keys", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, { q: "test", type: "all" });

    const counts = body.categoryCounts;
    expect("quizzes"   in counts).toBe(true);
    expect("questions" in counts).toBe(true);
    expect("sources"   in counts).toBe(true);
    expect("favorites" in counts).toBe(true);
  });

  test("no-match query should return zeros in all categoryCounts", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, {
      q: "NOMATCH_XYZ_IMPOSSIBLE_99999",
      type: "all",
    });

    expect(body.totalCount).toBe(0);
    expect(body.categoryCounts.quizzes).toBe(0);
    expect(body.categoryCounts.questions).toBe(0);
    expect(body.categoryCounts.sources).toBe(0);
    expect(body.categoryCounts.favorites).toBe(0);
  });
});

test.describe("Search – Cross-entity Full Lifecycle", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("seed all four entity types → verify in all+specific searches → delete → verify gone", async ({
    request,
  }) => {
    const seed = unique("XLifecycle");

    // ── 1. Create ─────────────────────────────────────────────────────────────
    const quiz     = await createQuiz(request, token, { title: `${seed} quiz` });
    const question = await createQuestion(request, token, {
      content: `${seed} question content`,
    });
    const source   = await createSource(request, token, {
      title: `${seed} source`,
      content: `${seed} raw text body`,
    });
    const fav      = await createFavorite(request, token, {
      text: `${seed} favorite`,
    });

    // ── 2. Verify in type=all ──────────────────────────────────────────────────
    const { body: allBody } = await searchApi(request, token, {
      q: seed,
      type: "all",
    });
    expect(
      allBody.results.some((r) => r.id === quiz.id && r.resultType === "quiz"),
    ).toBe(true);
    expect(
      allBody.results.some((r) => r.id === question.id && r.resultType === "question"),
    ).toBe(true);
    expect(
      allBody.results.some((r) => r.id === source.id && r.resultType === "source"),
    ).toBe(true);
    expect(
      allBody.results.some((r) => r.id === fav.id && r.resultType === "favorite"),
    ).toBe(true);

    // ── 3. Verify in type-specific searches ────────────────────────────────────
    const { body: qzBody } = await searchApi(request, token, {
      q: seed,
      type: "quiz",
    });
    expect(qzBody.results.some((r) => r.id === quiz.id)).toBe(true);

    const { body: qqBody } = await searchApi(request, token, {
      q: seed,
      type: "question",
    });
    expect(qqBody.results.some((r) => r.id === question.id)).toBe(true);

    const { body: srcBody } = await searchApi(request, token, {
      q: seed,
      type: "source",
    });
    expect(srcBody.results.some((r) => r.id === source.id)).toBe(true);

    const { body: favBody } = await searchApi(request, token, {
      q: seed,
      type: "favorite",
    });
    expect(favBody.results.some((r) => r.id === fav.id)).toBe(true);

    // ── 4. Delete all ──────────────────────────────────────────────────────────
    await deleteQuiz(request, token, quiz.id);
    await deleteQuestion(request, token, question.id);
    await deleteSource(request, token, source.id);
    await deleteFavorite(request, token, fav.id);

    // ── 5. Verify nothing remains ──────────────────────────────────────────────
    const { body: afterAll } = await searchApi(request, token, {
      q: seed,
      type: "all",
    });
    expect(afterAll.results.some((r) => r.id === quiz.id)).toBe(false);
    expect(afterAll.results.some((r) => r.id === question.id)).toBe(false);
    expect(afterAll.results.some((r) => r.id === source.id)).toBe(false);
    expect(afterAll.results.some((r) => r.id === fav.id)).toBe(false);
  });

  test("categoryCounts should decrease after deleting seeded entities", async ({
    request,
  }) => {
    const seed = unique("CountDelta");

    const quiz     = await createQuiz(request, token, { title: `${seed} quiz` });
    const question = await createQuestion(request, token, {
      content: `${seed} question content`,
    });

    const { body: before } = await searchApi(request, token, {
      q: seed,
      type: "all",
    });

    const quizCountBefore     = before.categoryCounts.quizzes;
    const questionCountBefore = before.categoryCounts.questions;

    await deleteQuiz(request, token, quiz.id);
    await deleteQuestion(request, token, question.id);

    const { body: after } = await searchApi(request, token, {
      q: seed,
      type: "all",
    });

    expect(after.categoryCounts.quizzes).toBeLessThan(quizCountBefore);
    expect(after.categoryCounts.questions).toBeLessThan(questionCountBefore);
  });
});
