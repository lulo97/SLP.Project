import { test, expect } from "@playwright/test";
import {
  login,
  unique,
  searchApi,
  createSource,
  deleteSource,
} from "./helpers.js";

test.describe("Search – Source (type=source)", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("should find a source by title", async ({ request }) => {
    const title = unique("SourceTitle");
    const source = await createSource(request, token, { title });

    const { body } = await searchApi(request, token, {
      q: title,
      type: "source",
    });

    expect(body.results.some((r) => r.id === source.id)).toBe(true);

    await deleteSource(request, token, source.id);
  });

  test("should find a source by rawText (content body)", async ({ request }) => {
    const rawToken = unique("RawTextToken");
    const source = await createSource(request, token, {
      title: unique("source"),
      content: `Full text body that contains ${rawToken} in the middle.`,
    });

    const { body } = await searchApi(request, token, {
      q: rawToken,
      type: "source",
    });

    expect(body.results.some((r) => r.id === source.id)).toBe(true);

    await deleteSource(request, token, source.id);
  });

  test("result items should all have resultType = 'source'", async ({
    request,
  }) => {
    const title = unique("TypeCheckS");
    const source = await createSource(request, token, { title });

    const { body } = await searchApi(request, token, {
      q: title,
      type: "source",
    });

    for (const item of body.results) {
      expect(item.resultType).toBe("source");
    }

    await deleteSource(request, token, source.id);
  });

  test("subType should be 'note' for note-type sources", async ({ request }) => {
    const title = unique("SubtypeSource");
    const source = await createSource(request, token, { title });

    const { body } = await searchApi(request, token, {
      q: title,
      type: "source",
    });

    const found = body.results.find((r) => r.id === source.id);
    expect(found).toBeTruthy();
    expect(found.subType).toBe("note");

    await deleteSource(request, token, source.id);
  });

  test("snippet should contain <mark> tags when content matches", async ({
    request,
  }) => {
    const keyword = unique("SnippetSrc");
    const source = await createSource(request, token, {
      title: unique("source"),
      content: `This body mentions ${keyword} in the middle of the text.`,
    });

    const { body } = await searchApi(request, token, {
      q: keyword,
      type: "source",
    });

    const found = body.results.find((r) => r.id === source.id);
    expect(found).toBeTruthy();
    if (found.snippet) {
      expect(found.snippet).toContain("<mark>");
      expect(found.snippet).toContain("</mark>");
    }

    await deleteSource(request, token, source.id);
  });

  test("soft-deleted source should NOT appear in search results", async ({
    request,
  }) => {
    const title = unique("DeletedSource");
    const source = await createSource(request, token, { title });

    await deleteSource(request, token, source.id);

    const { body } = await searchApi(request, token, {
      q: title,
      type: "source",
    });

    expect(body.results.some((r) => r.id === source.id)).toBe(false);
  });

  test("source created and then found by partial title match", async ({
    request,
  }) => {
    const uniquePart = unique("PartialSrc");
    const title = `Full title with ${uniquePart} embedded`;
    const source = await createSource(request, token, { title });

    const { body } = await searchApi(request, token, {
      q: uniquePart,
      type: "source",
    });

    expect(body.results.some((r) => r.id === source.id)).toBe(true);

    await deleteSource(request, token, source.id);
  });

  test("full lifecycle: create → find → soft-delete → not found", async ({
    request,
  }) => {
    const title = unique("LifecycleSource");
    const source = await createSource(request, token, { title });

    const { body: before } = await searchApi(request, token, {
      q: title,
      type: "source",
    });
    expect(before.results.some((r) => r.id === source.id)).toBe(true);

    await deleteSource(request, token, source.id);

    const { body: after } = await searchApi(request, token, {
      q: title,
      type: "source",
    });
    expect(after.results.some((r) => r.id === source.id)).toBe(false);
  });
});
