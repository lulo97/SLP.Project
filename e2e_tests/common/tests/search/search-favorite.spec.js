import { test, expect } from "@playwright/test";
import {
  login,
  unique,
  searchApi,
  createFavorite,
  deleteFavorite,
} from "./helpers.js";

test.describe("Search – Favorite (type=favorite)", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test("should find a favorite by text", async ({ request }) => {
    const text = unique("FavText");
    const fav = await createFavorite(request, token, { text });

    const { body } = await searchApi(request, token, {
      q: text,
      type: "favorite",
    });

    expect(body.results.some((r) => r.id === fav.id)).toBe(true);

    await deleteFavorite(request, token, fav.id);
  });

  test("should find a favorite by note content", async ({ request }) => {
    const noteToken = unique("FavNote");
    const fav = await createFavorite(request, token, {
      text: unique("fav"),
      note: `Note containing ${noteToken}`,
    });

    const { body } = await searchApi(request, token, {
      q: noteToken,
      type: "favorite",
    });

    expect(body.results.some((r) => r.id === fav.id)).toBe(true);

    await deleteFavorite(request, token, fav.id);
  });

  test("result items should all have resultType = 'favorite'", async ({
    request,
  }) => {
    const text = unique("TypeCheckF");
    const fav = await createFavorite(request, token, { text });

    const { body } = await searchApi(request, token, {
      q: text,
      type: "favorite",
    });

    for (const item of body.results) {
      expect(item.resultType).toBe("favorite");
    }

    await deleteFavorite(request, token, fav.id);
  });

  test("subType should match the favorite item type (e.g. idiom)", async ({
    request,
  }) => {
    const text = unique("SubtypeFav");
    const fav = await createFavorite(request, token, { text, type: "idiom" });

    const { body } = await searchApi(request, token, {
      q: text,
      type: "favorite",
    });

    const found = body.results.find((r) => r.id === fav.id);
    expect(found).toBeTruthy();
    expect(found.subType).toBe("idiom");

    await deleteFavorite(request, token, fav.id);
  });

  test("snippet should contain <mark> tags when text matches", async ({
    request,
  }) => {
    const text = unique("SnippetFav");
    const fav = await createFavorite(request, token, { text });

    const { body } = await searchApi(request, token, {
      q: text,
      type: "favorite",
    });

    const found = body.results.find((r) => r.id === fav.id);
    expect(found).toBeTruthy();
    if (found.snippet) {
      expect(found.snippet).toContain("<mark>");
      expect(found.snippet).toContain("</mark>");
    }

    await deleteFavorite(request, token, fav.id);
  });

  test("deleted favorite should NOT appear in search results", async ({
    request,
  }) => {
    const text = unique("DeletedFav");
    const fav = await createFavorite(request, token, { text });

    await deleteFavorite(request, token, fav.id);

    const { body } = await searchApi(request, token, {
      q: text,
      type: "favorite",
    });

    expect(body.results.some((r) => r.id === fav.id)).toBe(false);
  });

  test("all four favorite types are found by their text", async ({ request }) => {
    const TYPES = ["word", "phrase", "idiom", "other"];
    const created = [];

    for (const type of TYPES) {
      const text = unique(`FavType_${type}`);
      const fav = await createFavorite(request, token, { text, type });
      created.push({ id: fav.id, text });
    }

    for (const { id, text } of created) {
      const { body } = await searchApi(request, token, {
        q: text,
        type: "favorite",
      });
      expect(body.results.some((r) => r.id === id)).toBe(true);
    }

    for (const { id } of created) {
      await deleteFavorite(request, token, id);
    }
  });

  test("full lifecycle: create → find → delete → not found", async ({
    request,
  }) => {
    const text = unique("LifecycleFav");
    const fav = await createFavorite(request, token, { text });

    const { body: before } = await searchApi(request, token, {
      q: text,
      type: "favorite",
    });
    expect(before.results.some((r) => r.id === fav.id)).toBe(true);

    await deleteFavorite(request, token, fav.id);

    const { body: after } = await searchApi(request, token, {
      q: text,
      type: "favorite",
    });
    expect(after.results.some((r) => r.id === fav.id)).toBe(false);
  });
});
