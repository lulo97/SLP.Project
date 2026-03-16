import { test, expect } from "@playwright/test";
import {
  login,
  unique,
  searchApi,
  createQuiz,
  deleteQuiz,
} from "./helpers.js";

test.describe("Search – Quiz (type=quiz)", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("should find a quiz by title", async ({ request }) => {
    const title = unique("TitleSearch");
    const quiz = await createQuiz(request, token, { title });

    const { body } = await searchApi(request, token, { q: title, type: "quiz" });

    expect(body.results.some((r) => r.id === quiz.id)).toBe(true);

    await deleteQuiz(request, token, quiz.id);
  });

  test("should find a quiz by description", async ({ request }) => {
    const descToken = unique("DescSearch");
    const quiz = await createQuiz(request, token, {
      title: unique("quiz"),
      description: `Unique description token ${descToken}`,
    });

    const { body } = await searchApi(request, token, {
      q: descToken,
      type: "quiz",
    });

    expect(body.results.some((r) => r.id === quiz.id)).toBe(true);

    await deleteQuiz(request, token, quiz.id);
  });

  test("should find a quiz by tag name", async ({ request }) => {
    const tagToken = unique("tagsearch").toLowerCase();
    const quiz = await createQuiz(request, token, {
      title: unique("quiz"),
      tagNames: [tagToken],
    });

    const { body } = await searchApi(request, token, {
      q: tagToken,
      type: "quiz",
    });

    expect(body.results.some((r) => r.id === quiz.id)).toBe(true);

    await deleteQuiz(request, token, quiz.id);
  });

  test("result items should all have resultType = 'quiz'", async ({ request }) => {
    const title = unique("TypeCheck");
    const quiz = await createQuiz(request, token, { title });

    const { body } = await searchApi(request, token, { q: title, type: "quiz" });

    for (const item of body.results) {
      expect(item.resultType).toBe("quiz");
    }

    await deleteQuiz(request, token, quiz.id);
  });

  test("exact-title match should have rank >= description-only match", async ({
    request,
  }) => {
    const base = unique("RankTest");
    const exact = await createQuiz(request, token, {
      title: base,
      description: "irrelevant filler text",
    });
    const partial = await createQuiz(request, token, {
      title: unique("other"),
      description: `contains ${base} in description only`,
    });

    const { body } = await searchApi(request, token, { q: base, type: "quiz" });

    const exactRank  = body.results.find((r) => r.id === exact.id)?.rank ?? 0;
    const partialRank = body.results.find((r) => r.id === partial.id)?.rank ?? 0;

    expect(exactRank).toBeGreaterThanOrEqual(partialRank);

    await deleteQuiz(request, token, exact.id);
    await deleteQuiz(request, token, partial.id);
  });

  test("private quiz should be visible to its owner in search", async ({
    request,
  }) => {
    const title = unique("PrivateQuiz");
    const quiz = await createQuiz(request, token, {
      title,
      visibility: "private",
    });

    const { body } = await searchApi(request, token, { q: title, type: "quiz" });

    expect(body.results.some((r) => r.id === quiz.id)).toBe(true);

    await deleteQuiz(request, token, quiz.id);
  });

  test("snippet field should contain <mark> tags when there is a match", async ({
    request,
  }) => {
    const title = unique("SnippetCheck");
    const quiz = await createQuiz(request, token, {
      title,
      description: `The ${title} description contains details about this topic`,
    });

    const { body } = await searchApi(request, token, { q: title, type: "quiz" });

    const found = body.results.find((r) => r.id === quiz.id);
    expect(found).toBeTruthy();
    if (found.snippet) {
      expect(found.snippet).toContain("<mark>");
      expect(found.snippet).toContain("</mark>");
    }

    await deleteQuiz(request, token, quiz.id);
  });

  test("tags array should include the quiz's assigned tag names", async ({
    request,
  }) => {
    const tagName = unique("tagcheck").toLowerCase();
    const quiz = await createQuiz(request, token, {
      title: unique("TaggedQuiz"),
      tagNames: [tagName],
    });

    const { body } = await searchApi(request, token, {
      q: quiz.title,
      type: "quiz",
    });

    const found = body.results.find((r) => r.id === quiz.id);
    expect(found).toBeTruthy();
    expect(found.tags).toContain(tagName);

    await deleteQuiz(request, token, quiz.id);
  });

  test("visibility field should be present and correct on quiz results", async ({
    request,
  }) => {
    const title = unique("VisibilityCheck");
    const quiz = await createQuiz(request, token, {
      title,
      visibility: "public",
    });

    const { body } = await searchApi(request, token, { q: title, type: "quiz" });

    const found = body.results.find((r) => r.id === quiz.id);
    expect(found).toBeTruthy();
    expect(found.visibility).toBe("public");

    await deleteQuiz(request, token, quiz.id);
  });

  test("deleted quiz should not appear in search results", async ({ request }) => {
    const title = unique("DeletedQuiz");
    const quiz = await createQuiz(request, token, { title });

    await deleteQuiz(request, token, quiz.id);

    const { body } = await searchApi(request, token, { q: title, type: "quiz" });

    expect(body.results.some((r) => r.id === quiz.id)).toBe(false);
  });

  test("full lifecycle: create → find → delete → not found", async ({
    request,
  }) => {
    const title = unique("LifecycleQuiz");
    const quiz = await createQuiz(request, token, { title });

    const { body: before } = await searchApi(request, token, {
      q: title,
      type: "quiz",
    });
    expect(before.results.some((r) => r.id === quiz.id)).toBe(true);

    await deleteQuiz(request, token, quiz.id);

    const { body: after } = await searchApi(request, token, {
      q: title,
      type: "quiz",
    });
    expect(after.results.some((r) => r.id === quiz.id)).toBe(false);
  });
});
