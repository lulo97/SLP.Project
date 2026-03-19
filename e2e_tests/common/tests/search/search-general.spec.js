import { test, expect } from "@playwright/test";
import {
  login,
  unique,
  searchApi,
  createQuiz,
  deleteQuiz,
  API_BASE_URL,
} from "./helpers.js";

const RESULT_TYPES = ["quiz", "question", "source", "favorite"];
const VALID_TYPES  = ["all", "quiz", "question", "source", "favorite"];

test.describe("Search – Authentication & Authorization", () => {
  test("should return 401 when no session token is provided", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/search?q=hello`);
    expect(res.status()).toBe(401);
  });

  test("should return 401 for every type value when unauthenticated", async ({ request }) => {
    for (const type of VALID_TYPES) {
      const res = await request.get(
        `${API_BASE_URL}/search?q=hello&type=${type}`,
      );
      expect(res.status(), `type=${type} should be 401 without token`).toBe(401);
    }
  });
});

test.describe("Search – Input Validation", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("should return 400 when q param is missing", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/search`, {
      headers: { "X-Session-Token": token },
    });
    expect(res.status()).toBe(400);
  });

  test("should return 400 when q is empty string", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/search?q=`, {
      headers: { "X-Session-Token": token },
    });
    expect(res.status()).toBe(400);
  });

  test("should return 400 when q is whitespace only", async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/search?q=${encodeURIComponent("   ")}`,
      { headers: { "X-Session-Token": token } },
    );
    expect(res.status()).toBe(400);
  });

  test("should accept a single character as a valid query", async ({ request }) => {
    const { res } = await searchApi(request, token, { q: "a" });
    expect(res.status()).toBe(200);
  });

  test("unknown type value should fall back to 'all'", async ({ request }) => {
    const { res, body } = await searchApi(request, token, {
      q: "hello",
      type: "invalid_type_xyz",
    });
    expect(res.status()).toBe(200);
    expect(body.type).toBe("all");
  });

  test("pageSize above 50 should be clamped to 50", async ({ request }) => {
    const { res, body } = await searchApi(request, token, {
      q: "test",
      pageSize: 999,
    });
    expect(res.status()).toBe(200);
    expect(body.pageSize).toBe(50);
  });

  test("pageSize below 1 should be clamped to 1", async ({ request }) => {
    const { res, body } = await searchApi(request, token, {
      q: "test",
      pageSize: 0,
    });
    expect(res.status()).toBe(200);
    expect(body.pageSize).toBe(1);
  });

  test("page below 1 should be clamped to 1", async ({ request }) => {
    const { res, body } = await searchApi(request, token, {
      q: "test",
      page: -5,
    });
    expect(res.status()).toBe(200);
    expect(body.page).toBe(1);
  });
});

test.describe("Search – Response Shape", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("response should contain all required top-level fields with correct types", async ({
    request,
  }) => {
    const { res, body } = await searchApi(request, token, { q: "test" });
    expect(res.status()).toBe(200);
    expect(typeof body.query).toBe("string");
    expect(typeof body.type).toBe("string");
    expect(typeof body.page).toBe("number");
    expect(typeof body.pageSize).toBe("number");
    expect(typeof body.totalCount).toBe("number");
    expect(typeof body.totalPages).toBe("number");
    expect(Array.isArray(body.results)).toBe(true);
  });

  test("type=all response should include categoryCounts", async ({ request }) => {
    const { res, body } = await searchApi(request, token, {
      q: "test",
      type: "all",
    });
    expect(res.status()).toBe(200);
    expect(body.categoryCounts).not.toBeNull();
    expect(typeof body.categoryCounts.quizzes).toBe("number");
    expect(typeof body.categoryCounts.questions).toBe("number");
    expect(typeof body.categoryCounts.sources).toBe("number");
    expect(typeof body.categoryCounts.favorites).toBe("number");
  });

  test("single-type response should NOT include categoryCounts", async ({
    request,
  }) => {
    for (const type of RESULT_TYPES) {
      const { res, body } = await searchApi(request, token, {
        q: "test",
        type,
      });
      expect(res.status()).toBe(200);
      expect(
        body.categoryCounts ?? null,
        `type=${type} should not have categoryCounts`,
      ).toBeNull();
    }
  });

  test("each result item should have required fields", async ({ request }) => {
    const title = unique("ShapeCheck");
    const quiz = await createQuiz(request, token, { title });

    const { body } = await searchApi(request, token, {
      q: title,
      type: "quiz",
    });

    for (const item of body.results) {
      expect(typeof item.id).toBe("number");
      expect(typeof item.resultType).toBe("string");
      expect(typeof item.title).toBe("string");
      expect(typeof item.rank).toBe("number");
      expect(Array.isArray(item.tags)).toBe(true);
      expect(typeof item.createdAt).toBe("string");
      expect(RESULT_TYPES).toContain(item.resultType);
    }

    await deleteQuiz(request, token, quiz.id);
  });

  test("query field in response should echo the trimmed query string", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, { q: "  hello  " });
    expect(body.query).toBe("hello");
  });

  test("results should be an empty array (not null) when nothing matches", async ({
    request,
  }) => {
    const { res, body } = await searchApi(request, token, {
      q: "NOMATCH_XYZ_IMPOSSIBLE_STRING_99999",
    });
    expect(res.status()).toBe(200);
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBe(0);
    expect(body.totalCount).toBe(0);
  });
});

test.describe("Search – Pagination", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("should respect pageSize parameter", async ({ request }) => {
    const { body } = await searchApi(request, token, {
      q: "test",
      type: "quiz",
      pageSize: 2,
    });
    expect(body.results.length).toBeLessThanOrEqual(2);
    expect(body.pageSize).toBe(2);
  });

  test("totalPages should equal ceil(totalCount / pageSize)", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, {
      q: "test",
      type: "quiz",
      pageSize: 3,
    });
    const expected =
      body.totalCount === 0 ? 0 : Math.ceil(body.totalCount / body.pageSize);
    expect(body.totalPages).toBe(expected);
  });

  test("page 2 should return different results than page 1", async ({
    request,
  }) => {
    const pagToken = unique("PagToken");
    const created = [];
    for (let i = 0; i < 4; i++) {
      const q = await createQuiz(request, token, {
        title: `${pagToken} quiz number ${i}`,
      });
      created.push(q);
    }

    const { body: page1 } = await searchApi(request, token, {
      q: pagToken,
      type: "quiz",
      pageSize: 2,
      page: 1,
    });
    const { body: page2 } = await searchApi(request, token, {
      q: pagToken,
      type: "quiz",
      pageSize: 2,
      page: 2,
    });

    const ids1 = page1.results.map((r) => r.id);
    const ids2 = page2.results.map((r) => r.id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap.length).toBe(0);

    for (const q of created) await deleteQuiz(request, token, q.id);
  });

  test("page beyond totalPages should return empty results", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, {
      q: "NOMATCH_XYZ_IMPOSSIBLE_99999",
      type: "quiz",
      page: 999,
    });
    expect(body.results.length).toBe(0);
  });

  test("page and pageSize should be echoed in the response", async ({
    request,
  }) => {
    const { body } = await searchApi(request, token, {
      q: "test",
      type: "quiz",
      page: 2,
      pageSize: 5,
    });
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(5);
  });
});
