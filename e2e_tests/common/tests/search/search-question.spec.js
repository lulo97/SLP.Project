import { test, expect } from "@playwright/test";
import {
  login,
  unique,
  searchApi,
  createQuestion,
  deleteQuestion,
} from "./helpers.js";

test.describe("Search – Question (type=question)", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("should find a question by content", async ({ request }) => {
    const content = unique("QuestionContent");
    const question = await createQuestion(request, token, { content });

    const { body } = await searchApi(request, token, {
      q: content,
      type: "question",
    });

    expect(body.results.some((r) => r.id === question.id)).toBe(true);

    await deleteQuestion(request, token, question.id);
  });

  test("should find a question by explanation text", async ({ request }) => {
    const explToken = unique("ExplSearch");
    const question = await createQuestion(request, token, {
      content: unique("q content"),
      explanation: `Explanation containing ${explToken}`,
    });

    const { body } = await searchApi(request, token, {
      q: explToken,
      type: "question",
    });

    expect(body.results.some((r) => r.id === question.id)).toBe(true);

    await deleteQuestion(request, token, question.id);
  });

  test("should find a question by tag name", async ({ request }) => {
    const tagToken = unique("qtag").toLowerCase();
    const question = await createQuestion(request, token, {
      content: unique("q content"),
      tagNames: [tagToken],
    });

    const { body } = await searchApi(request, token, {
      q: tagToken,
      type: "question",
    });

    expect(body.results.some((r) => r.id === question.id)).toBe(true);

    await deleteQuestion(request, token, question.id);
  });

  test("result items should all have resultType = 'question'", async ({
    request,
  }) => {
    const content = unique("TypeCheckQ");
    const question = await createQuestion(request, token, { content });

    const { body } = await searchApi(request, token, {
      q: content,
      type: "question",
    });

    for (const item of body.results) {
      expect(item.resultType).toBe("question");
    }

    await deleteQuestion(request, token, question.id);
  });

  test("subType should match the question type field", async ({ request }) => {
    const content = unique("SubtypeQuestion");
    const question = await createQuestion(request, token, {
      content,
      type: "true_false",
    });

    const { body } = await searchApi(request, token, {
      q: content,
      type: "question",
    });

    const found = body.results.find((r) => r.id === question.id);
    expect(found).toBeTruthy();
    expect(found.subType).toBe("true_false");

    await deleteQuestion(request, token, question.id);
  });

  test("title should be a truncated version of content (≤120 chars)", async ({
    request,
  }) => {
    const prefix = unique("LongContent");
    const longContent = prefix + " extra filler words ".repeat(15);
    const question = await createQuestion(request, token, {
      content: longContent,
    });

    const { body } = await searchApi(request, token, {
      q: prefix,
      type: "question",
    });

    const found = body.results.find((r) => r.id === question.id);
    expect(found).toBeTruthy();
    expect(found.title.length).toBeLessThanOrEqual(120);

    await deleteQuestion(request, token, question.id);
  });

  test("deleted question should not appear in search results", async ({
    request,
  }) => {
    const content = unique("DeletedQuestion");
    const question = await createQuestion(request, token, { content });

    await deleteQuestion(request, token, question.id);

    const { body } = await searchApi(request, token, {
      q: content,
      type: "question",
    });

    expect(body.results.some((r) => r.id === question.id)).toBe(false);
  });

  test("full lifecycle: create → find → delete → not found", async ({
    request,
  }) => {
    const content = unique("LifecycleQuestion");
    const question = await createQuestion(request, token, { content });

    const { body: before } = await searchApi(request, token, {
      q: content,
      type: "question",
    });
    expect(before.results.some((r) => r.id === question.id)).toBe(true);

    await deleteQuestion(request, token, question.id);

    const { body: after } = await searchApi(request, token, {
      q: content,
      type: "question",
    });
    expect(after.results.some((r) => r.id === question.id)).toBe(false);
  });

  test("multiple question types are all found by their content", async ({
    request,
  }) => {
    const types = ["true_false", "flashcard"];
    const created = [];

    for (const type of types) {
      const content = unique(`TypeSearch_${type}`);
      const q = await createQuestion(request, token, { type, content });
      created.push({ id: q.id, content });
    }

    for (const { id, content } of created) {
      const { body } = await searchApi(request, token, {
        q: content,
        type: "question",
      });
      expect(body.results.some((r) => r.id === id)).toBe(true);
    }

    for (const { id } of created) {
      await deleteQuestion(request, token, id);
    }
  });
});
