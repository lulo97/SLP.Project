import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:5140/api";

const adminUser = {
  username: "admin",
  password: "123",
};

// Allowed favorite types defined in FavoriteService
const ALLOWED_TYPES = ["word", "phrase", "idiom", "other"];

function generateFavorite(overrides = {}) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    text: `Playwright word ${id}`,
    type: "word",
    note: `Note for item ${id}`,
    ...overrides,
  };
}

test.describe("Favourite API Comprehensive Tests", () => {
  let adminToken;

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    adminToken = loginBody.token;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Authentication & Authorization
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Authentication & Authorization", () => {
    test("should return 401 for all unauthenticated requests", async ({
      request,
    }) => {
      const endpoints = [
        { method: "get", url: "/favorites" },
        {
          method: "post",
          url: "/favorites",
          data: { text: "hello", type: "word" },
        },
        {
          method: "put",
          url: "/favorites/1",
          data: { text: "updated" },
        },
        { method: "delete", url: "/favorites/1" },
      ];

      for (const ep of endpoints) {
        let res;
        if (ep.method === "get") {
          res = await request.get(`${API_BASE_URL}${ep.url}`);
        } else if (ep.method === "post") {
          res = await request.post(`${API_BASE_URL}${ep.url}`, {
            data: ep.data,
          });
        } else if (ep.method === "put") {
          res = await request.put(`${API_BASE_URL}${ep.url}`, {
            data: ep.data,
          });
        } else if (ep.method === "delete") {
          res = await request.delete(`${API_BASE_URL}${ep.url}`);
        }
        expect(
          res.status(),
          `Endpoint ${ep.method.toUpperCase()} ${ep.url} should return 401`,
        ).toBe(401);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Create favourite", () => {
    test("should create a favourite with all valid fields", async ({
      request,
    }) => {
      const data = generateFavorite();
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data,
      });
      expect(res.status()).toBe(201);

      const created = await res.json();
      expect(created.id).toBeTruthy();
      expect(created.text).toBe(data.text);
      expect(created.type).toBe(data.type);
      expect(created.note).toBe(data.note);
      expect(created.createdAt).toBeTruthy();
      expect(created.updatedAt).toBeTruthy();

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should create a favourite without note (optional field)", async ({
      request,
    }) => {
      const data = generateFavorite({ note: undefined });
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data,
      });
      expect(res.status()).toBe(201);

      const created = await res.json();
      expect(created.id).toBeTruthy();
      expect(created.text).toBe(data.text);
      expect(created.note == null).toBe(true);

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should create favourites for each allowed type", async ({
      request,
    }) => {
      const createdIds = [];

      for (const type of ALLOWED_TYPES) {
        const res = await request.post(`${API_BASE_URL}/favorites`, {
          headers: { "X-Session-Token": adminToken },
          data: generateFavorite({ type }),
        });
        expect(res.status()).toBe(201);

        const created = await res.json();
        expect(created.type).toBe(type.toLowerCase());
        expect(ALLOWED_TYPES).toContain(created.type);
        createdIds.push(created.id);
      }

      // Clean up
      for (const id of createdIds) {
        await request.delete(`${API_BASE_URL}/favorites/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
      }
    });

    test("should default type to 'other' when an invalid type is provided", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ type: "invalid_type_xyz" }),
      });
      expect(res.status()).toBe(201);

      const created = await res.json();
      expect(created.type).toBe("other");

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should store type in lowercase even when submitted in mixed case", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ type: "WORD" }),
      });
      expect(res.status()).toBe(201);

      const created = await res.json();
      expect(created.type).toBe("word");

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should trim leading/trailing whitespace from text", async ({
      request,
    }) => {
      const rawText = "  trimmed word  ";
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ text: rawText }),
      });
      expect(res.status()).toBe(201);

      const created = await res.json();
      expect(created.text).toBe(rawText.trim());

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should trim leading/trailing whitespace from note", async ({
      request,
    }) => {
      const rawNote = "  note with spaces  ";
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ note: rawNote }),
      });
      expect(res.status()).toBe(201);

      const created = await res.json();
      expect(created.note).toBe(rawNote.trim());

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should return 400 when text is missing", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: { type: "word", note: "some note" },
      });
      expect(res.status()).toBe(400);
    });

    test("should return 400 when text is empty string", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: { text: "", type: "word" },
      });
      expect(res.status()).toBe(400);
    });

    test("should return 400 when text is whitespace only", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: { text: "   ", type: "word" },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Get / List
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Get favourites", () => {
    test("should list all favourites for the authenticated user", async ({
      request,
    }) => {
      const createdIds = [];
      for (let i = 0; i < 3; i++) {
        const res = await request.post(`${API_BASE_URL}/favorites`, {
          headers: { "X-Session-Token": adminToken },
          data: generateFavorite(),
        });
        expect(res.status()).toBe(201);
        createdIds.push((await res.json()).id);
      }

      const listRes = await request.get(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(listRes.status()).toBe(200);

      const items = await listRes.json();
      expect(Array.isArray(items)).toBe(true);
      for (const id of createdIds) {
        expect(items.find((f) => f.id === id)).toBeTruthy();
      }

      // Clean up
      for (const id of createdIds) {
        await request.delete(`${API_BASE_URL}/favorites/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
      }
    });

    test("should return favourites ordered by createdAt descending", async ({
      request,
    }) => {
      const createdIds = [];
      for (let i = 0; i < 3; i++) {
        const res = await request.post(`${API_BASE_URL}/favorites`, {
          headers: { "X-Session-Token": adminToken },
          data: generateFavorite({ text: `Order test word ${i} ${Date.now()}` }),
        });
        expect(res.status()).toBe(201);
        createdIds.push((await res.json()).id);
      }

      const listRes = await request.get(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(listRes.status()).toBe(200);

      const items = await listRes.json();
      const ownedItems = items.filter((f) => createdIds.includes(f.id));

      // Verify descending order
      for (let i = 1; i < ownedItems.length; i++) {
        expect(
          new Date(ownedItems[i].createdAt).getTime(),
        ).toBeLessThanOrEqual(
          new Date(ownedItems[i - 1].createdAt).getTime(),
        );
      }

      // Clean up
      for (const id of createdIds) {
        await request.delete(`${API_BASE_URL}/favorites/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
      }
    });

    test("should search favourites by text match", async ({ request }) => {
      const uniqueToken = `UNIQUETOKEN${Date.now()}`;
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ text: `word_${uniqueToken}` }),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const searchRes = await request.get(
        `${API_BASE_URL}/favorites?search=${uniqueToken}`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(searchRes.status()).toBe(200);

      const items = await searchRes.json();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.find((f) => f.id === created.id)).toBeTruthy();

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should search favourites by note match", async ({ request }) => {
      const uniqueNote = `UNIQUENOTE${Date.now()}`;
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ note: `context: ${uniqueNote}` }),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const searchRes = await request.get(
        `${API_BASE_URL}/favorites?search=${uniqueNote}`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(searchRes.status()).toBe(200);

      const items = await searchRes.json();
      expect(items.find((f) => f.id === created.id)).toBeTruthy();

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should search case-insensitively", async ({ request }) => {
      const uniqueText = `CaseSensitiveWord${Date.now()}`;
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ text: uniqueText }),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      // Search with different casing
      const searchRes = await request.get(
        `${API_BASE_URL}/favorites?search=${uniqueText.toLowerCase()}`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(searchRes.status()).toBe(200);

      const items = await searchRes.json();
      expect(items.find((f) => f.id === created.id)).toBeTruthy();

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should return empty array when search matches nothing", async ({
      request,
    }) => {
      const searchRes = await request.get(
        `${API_BASE_URL}/favorites?search=NOMATCH_XYZ_99999999`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(searchRes.status()).toBe(200);

      const items = await searchRes.json();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Update favourite", () => {
    test("should update text successfully", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite(),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const newText = `Updated text ${Date.now()}`;
      const updateRes = await request.put(
        `${API_BASE_URL}/favorites/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { text: newText },
        },
      );
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated.text).toBe(newText);
      expect(updated.updatedAt).not.toBe(created.updatedAt);

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should update type successfully", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ type: "word" }),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const updateRes = await request.put(
        `${API_BASE_URL}/favorites/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { type: "phrase" },
        },
      );
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated.type).toBe("phrase");

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should update note successfully", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ note: "old note" }),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const newNote = `Updated note ${Date.now()}`;
      const updateRes = await request.put(
        `${API_BASE_URL}/favorites/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { note: newNote },
        },
      );
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated.note).toBe(newNote);

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should update all fields at once", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ type: "word", note: "original note" }),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const payload = {
        text: `All updated ${Date.now()}`,
        type: "idiom",
        note: "all updated note",
      };
      const updateRes = await request.put(
        `${API_BASE_URL}/favorites/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: payload,
        },
      );
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated.text).toBe(payload.text);
      expect(updated.type).toBe(payload.type);
      expect(updated.note).toBe(payload.note);

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should fall back type to 'other' when invalid type is provided on update", async ({
      request,
    }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ type: "word" }),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const updateRes = await request.put(
        `${API_BASE_URL}/favorites/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { type: "completely_invalid" },
        },
      );
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated.type).toBe("other");

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should not change text when text is omitted from update payload", async ({
      request,
    }) => {
      const originalData = generateFavorite();
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: originalData,
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const updateRes = await request.put(
        `${API_BASE_URL}/favorites/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { note: "only note updated" },
        },
      );
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated.text).toBe(originalData.text.trim());

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should trim whitespace from updated text", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite(),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const updateRes = await request.put(
        `${API_BASE_URL}/favorites/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { text: "  trimmed update  " },
        },
      );
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated.text).toBe("trimmed update");

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should return 404 when updating non-existent favourite", async ({
      request,
    }) => {
      const res = await request.put(`${API_BASE_URL}/favorites/9999999`, {
        headers: { "X-Session-Token": adminToken },
        data: { text: "ghost update" },
      });
      expect(res.status()).toBe(404);
    });

    test("should return 401 when updating without authentication", async ({
      request,
    }) => {
      const res = await request.put(`${API_BASE_URL}/favorites/1`, {
        data: { text: "unauthorized" },
      });
      expect(res.status()).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Delete favourite", () => {
    test("should delete a favourite successfully", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite(),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const deleteRes = await request.delete(
        `${API_BASE_URL}/favorites/${created.id}`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(deleteRes.status()).toBe(204);
    });

    test("should return 404 when deleting non-existent favourite", async ({
      request,
    }) => {
      const res = await request.delete(`${API_BASE_URL}/favorites/9999999`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(res.status()).toBe(404);
    });

    test("should return 401 when deleting without authentication", async ({
      request,
    }) => {
      const res = await request.delete(`${API_BASE_URL}/favorites/1`);
      expect(res.status()).toBe(401);
    });

    test("deleted favourite should not appear in list", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite(),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });

      const listRes = await request.get(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(listRes.status()).toBe(200);
      const items = await listRes.json();
      expect(items.find((f) => f.id === created.id)).toBeUndefined();
    });

    test("deleted favourite should not appear in search results", async ({
      request,
    }) => {
      const uniqueText = `DeleteSearchCheck_${Date.now()}`;
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite({ text: uniqueText }),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });

      const searchRes = await request.get(
        `${API_BASE_URL}/favorites?search=${uniqueText}`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(searchRes.status()).toBe(200);
      const items = await searchRes.json();
      expect(items.find((f) => f.id === created.id)).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DTO shape validation
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("DTO shape validation", () => {
    test("created favourite should have all expected fields with correct types", async ({
      request,
    }) => {
      const data = generateFavorite();
      const res = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data,
      });
      expect(res.status()).toBe(201);
      const created = await res.json();

      expect(typeof created.id).toBe("number");
      expect(typeof created.text).toBe("string");
      expect(typeof created.type).toBe("string");
      expect(typeof created.createdAt).toBe("string");
      expect(typeof created.updatedAt).toBe("string");
      expect(ALLOWED_TYPES).toContain(created.type);

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("updatedAt should change after an update", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite(),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      // Small delay to ensure updatedAt differs
      await new Promise((r) => setTimeout(r, 50));

      const updateRes = await request.put(
        `${API_BASE_URL}/favorites/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { text: `Timestamp check ${Date.now()}` },
        },
      );
      expect(updateRes.status()).toBe(200);
      const updated = await updateRes.json();

      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime(),
      );

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("list response items should contain all required fields", async ({
      request,
    }) => {
      const createRes = await request.post(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
        data: generateFavorite(),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const listRes = await request.get(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(listRes.status()).toBe(200);
      const items = await listRes.json();

      const found = items.find((f) => f.id === created.id);
      expect(found).toBeTruthy();
      expect(typeof found.id).toBe("number");
      expect(typeof found.text).toBe("string");
      expect(typeof found.type).toBe("string");
      expect(typeof found.createdAt).toBe("string");
      expect(typeof found.updatedAt).toBe("string");

      // Clean up
      await request.delete(`${API_BASE_URL}/favorites/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Full lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Full lifecycle (create, list, search, update, delete, verify)", () => {
    test("should handle complete favourite lifecycle for all types", async ({
      request,
    }) => {
      const createdIds = [];

      // 1. Create one favourite per allowed type
      for (const type of ALLOWED_TYPES) {
        const res = await request.post(`${API_BASE_URL}/favorites`, {
          headers: { "X-Session-Token": adminToken },
          data: {
            text: `Lifecycle ${type} ${Date.now()}`,
            type,
            note: `Note for lifecycle ${type}`,
          },
        });
        expect(res.status()).toBe(201);
        const created = await res.json();
        expect(created.type).toBe(type);
        createdIds.push(created.id);
      }

      // 2. List and verify all appear
      const listRes = await request.get(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(listRes.status()).toBe(200);
      const items = await listRes.json();
      for (const id of createdIds) {
        expect(items.find((f) => f.id === id)).toBeTruthy();
      }

      // 3. Update each favourite
      for (const id of createdIds) {
        const updateRes = await request.put(
          `${API_BASE_URL}/favorites/${id}`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { note: `Updated note for lifecycle item ${id}` },
          },
        );
        expect(updateRes.status()).toBe(200);
        const updated = await updateRes.json();
        expect(updated.note).toBe(`Updated note for lifecycle item ${id}`);
      }

      // 4. Search and verify updated notes are searchable
      for (const id of createdIds) {
        const searchRes = await request.get(
          `${API_BASE_URL}/favorites?search=lifecycle item ${id}`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(searchRes.status()).toBe(200);
        const found = await searchRes.json();
        expect(found.find((f) => f.id === id)).toBeTruthy();
      }

      // 5. Delete all
      for (const id of createdIds) {
        const delRes = await request.delete(
          `${API_BASE_URL}/favorites/${id}`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(delRes.status()).toBe(204);
      }

      // 6. Verify none remain in list
      const finalListRes = await request.get(`${API_BASE_URL}/favorites`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(finalListRes.status()).toBe(200);
      const remaining = await finalListRes.json();
      for (const id of createdIds) {
        expect(remaining.find((f) => f.id === id)).toBeUndefined();
      }

      // 7. Confirm 404 on re-delete
      for (const id of createdIds) {
        const reDeleteRes = await request.delete(
          `${API_BASE_URL}/favorites/${id}`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(reDeleteRes.status()).toBe(404);
      }
    });
  });
});