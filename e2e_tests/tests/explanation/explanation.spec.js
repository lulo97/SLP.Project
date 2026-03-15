import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:5140/api";

const adminUser = {
  username: "admin",
  password: "123",
};

function generateExplanation(sourceId) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    sourceId,
    content: `Explanation content ${id}`,
    textRange: { start: 0, end: 42 },
  };
}

test.describe("Explanation API Comprehensive Tests", () => {
  let adminToken;
  let sharedSourceId; // A source created once and reused across describe blocks

  test.beforeAll(async ({ request }) => {
    // Login once and store token for all tests
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    adminToken = loginBody.token;

    // Create a shared source to use in explanation tests
    const sourceRes = await request.post(`${API_BASE_URL}/source/note`, {
      headers: { "X-Session-Token": adminToken },
      data: {
        title: `Shared Source for Explanations ${Date.now()}`,
        content: "Content for explanation tests",
      },
    });
    expect(sourceRes.status()).toBe(201);
    const source = await sourceRes.json();
    sharedSourceId = source.id;
  });

  test.afterAll(async ({ request }) => {
    // Clean up the shared source
    if (sharedSourceId) {
      await request.delete(`${API_BASE_URL}/source/${sharedSourceId}`, {
        headers: { "X-Session-Token": adminToken },
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Authentication & Authorization
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Authentication & Authorization", () => {
    test("should return 401 for all unauthenticated requests", async ({
      request,
    }) => {
      const endpoints = [
        { method: "get", url: "/sources/1/explanations" },
        {
          method: "post",
          url: "/explanations",
          data: { sourceId: 1, content: "test" },
        },
        {
          method: "put",
          url: "/explanations/1",
          data: { content: "updated" },
        },
        { method: "delete", url: "/explanations/1" },
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

  test.describe("Create explanation", () => {
    test("should create an explanation with textRange", async ({ request }) => {
      const data = generateExplanation(sharedSourceId);
      const res = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data,
      });
      expect(res.status()).toBe(201);

      const created = await res.json();
      expect(created.id).toBeTruthy();
      expect(created.sourceId).toBe(sharedSourceId);
      expect(created.content).toBe(data.content);
      expect(created.textRange).toMatchObject(data.textRange);
      expect(created.authorType).toBe("user");
      expect(created.editable).toBe(true);
      expect(created.createdAt).toBeTruthy();

      // Clean up
      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should create an explanation without textRange (null)", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: {
          sourceId: sharedSourceId,
          content: `No range content ${Date.now()}`,
          textRange: null,
        },
      });
      expect(res.status()).toBe(201);

      const created = await res.json();
      expect(created.id).toBeTruthy();
      expect(created.content).toBeTruthy();

      // Clean up
      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should return 400 when content is missing", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: {
          sourceId: sharedSourceId,
          textRange: { start: 0, end: 10 },
          // content omitted
        },
      });
      expect(res.status()).toBe(400);
    });

    test("should return 400 when content is empty string", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: {
          sourceId: sharedSourceId,
          content: "",
          textRange: { start: 0, end: 10 },
        },
      });
      expect(res.status()).toBe(400);
    });

    test("should return 400 when content is whitespace only", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: {
          sourceId: sharedSourceId,
          content: "   ",
          textRange: { start: 0, end: 10 },
        },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Get by source
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Get explanations by source", () => {
    test("should return explanations for a valid source", async ({
      request,
    }) => {
      // Create two explanations
      const createdIds = [];
      for (let i = 0; i < 2; i++) {
        const res = await request.post(`${API_BASE_URL}/explanations`, {
          headers: { "X-Session-Token": adminToken },
          data: generateExplanation(sharedSourceId),
        });
        expect(res.status()).toBe(201);
        const body = await res.json();
        createdIds.push(body.id);
      }

      // Fetch explanations
      const listRes = await request.get(
        `${API_BASE_URL}/sources/${sharedSourceId}/explanations`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(listRes.status()).toBe(200);

      const items = await listRes.json();
      expect(Array.isArray(items)).toBe(true);
      for (const id of createdIds) {
        const found = items.find((e) => e.id === id);
        expect(found).toBeTruthy();
        expect(found.sourceId).toBe(sharedSourceId);
      }

      // Clean up
      for (const id of createdIds) {
        await request.delete(`${API_BASE_URL}/explanations/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
      }
    });

    test("should return empty array for source with no explanations", async ({
      request,
    }) => {
      // Create a fresh source
      const srcRes = await request.post(`${API_BASE_URL}/source/note`, {
        headers: { "X-Session-Token": adminToken },
        data: { title: `Empty source ${Date.now()}`, content: "no content" },
      });
      expect(srcRes.status()).toBe(201);
      const src = await srcRes.json();

      const listRes = await request.get(
        `${API_BASE_URL}/sources/${src.id}/explanations`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(listRes.status()).toBe(200);

      const items = await listRes.json();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(0);

      // Clean up
      await request.delete(`${API_BASE_URL}/source/${src.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should not return explanations for a source that does not belong to the user", async ({
      request,
    }) => {
      // Using a non-existent source that belongs to no one should return empty
      const listRes = await request.get(
        `${API_BASE_URL}/sources/9999999/explanations`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(listRes.status()).toBe(200);
      const items = await listRes.json();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(0);
    });

    test("should return explanations ordered by createdAt ascending", async ({
      request,
    }) => {
      const createdIds = [];
      for (let i = 0; i < 3; i++) {
        const res = await request.post(`${API_BASE_URL}/explanations`, {
          headers: { "X-Session-Token": adminToken },
          data: {
            sourceId: sharedSourceId,
            content: `Ordered explanation ${i} ${Date.now()}`,
          },
        });
        expect(res.status()).toBe(201);
        createdIds.push((await res.json()).id);
      }

      const listRes = await request.get(
        `${API_BASE_URL}/sources/${sharedSourceId}/explanations`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(listRes.status()).toBe(200);
      const items = await listRes.json();

      // Verify ascending order
      const ownedItems = items.filter((e) => createdIds.includes(e.id));
      for (let i = 1; i < ownedItems.length; i++) {
        expect(new Date(ownedItems[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(ownedItems[i - 1].createdAt).getTime(),
        );
      }

      // Clean up
      for (const id of createdIds) {
        await request.delete(`${API_BASE_URL}/explanations/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Update explanation", () => {
    test("should update explanation content successfully", async ({
      request,
    }) => {
      // Create
      const createRes = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: generateExplanation(sharedSourceId),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      // Update
      const updatedContent = `Updated content ${Date.now()}`;
      const updateRes = await request.put(
        `${API_BASE_URL}/explanations/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { content: updatedContent },
        },
      );
      expect(updateRes.status()).toBe(200);

      const updated = await updateRes.json();
      expect(updated.id).toBe(created.id);
      expect(updated.content).toBe(updatedContent);
      expect(updated.updatedAt).toBeTruthy();

      // Clean up
      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should return 400 when updating with empty content", async ({
      request,
    }) => {
      const createRes = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: generateExplanation(sharedSourceId),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const updateRes = await request.put(
        `${API_BASE_URL}/explanations/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { content: "" },
        },
      );
      expect(updateRes.status()).toBe(400);

      // Clean up
      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should return 400 when updating with whitespace-only content", async ({
      request,
    }) => {
      const createRes = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: generateExplanation(sharedSourceId),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const updateRes = await request.put(
        `${API_BASE_URL}/explanations/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { content: "   " },
        },
      );
      expect(updateRes.status()).toBe(400);

      // Clean up
      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should return 404 when updating non-existent explanation", async ({
      request,
    }) => {
      const res = await request.put(`${API_BASE_URL}/explanations/9999999`, {
        headers: { "X-Session-Token": adminToken },
        data: { content: "some content" },
      });
      expect(res.status()).toBe(404);
    });

    test("should return 401 when updating without authentication", async ({
      request,
    }) => {
      const res = await request.put(`${API_BASE_URL}/explanations/1`, {
        data: { content: "unauthorized update" },
      });
      expect(res.status()).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Delete explanation", () => {
    test("should delete an explanation successfully", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: generateExplanation(sharedSourceId),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const deleteRes = await request.delete(
        `${API_BASE_URL}/explanations/${created.id}`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(deleteRes.status()).toBe(204);
    });

    test("should return 404 when deleting non-existent explanation", async ({
      request,
    }) => {
      const res = await request.delete(`${API_BASE_URL}/explanations/9999999`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(res.status()).toBe(404);
    });

    test("should return 401 when deleting without authentication", async ({
      request,
    }) => {
      const res = await request.delete(`${API_BASE_URL}/explanations/1`);
      expect(res.status()).toBe(401);
    });

    test("deleted explanation should not appear in source list", async ({
      request,
    }) => {
      const createRes = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: generateExplanation(sharedSourceId),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });

      const listRes = await request.get(
        `${API_BASE_URL}/sources/${sharedSourceId}/explanations`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(listRes.status()).toBe(200);
      const items = await listRes.json();
      const found = items.find((e) => e.id === created.id);
      expect(found).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DTO shape validation
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("DTO shape validation", () => {
    test("created explanation should have all expected fields", async ({
      request,
    }) => {
      const data = generateExplanation(sharedSourceId);
      const res = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data,
      });
      expect(res.status()).toBe(201);
      const created = await res.json();

      // Required fields
      expect(typeof created.id).toBe("number");
      expect(typeof created.sourceId).toBe("number");
      expect(typeof created.content).toBe("string");
      expect(typeof created.authorType).toBe("string");
      expect(typeof created.editable).toBe("boolean");
      expect(typeof created.createdAt).toBe("string");

      // Values
      expect(created.authorType).toBe("user");
      expect(created.editable).toBe(true);
      expect(created.updatedAt).toBeNull();

      // Clean up
      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("textRange should be deserialised as an object, not a string", async ({
      request,
    }) => {
      const textRange = { start: 10, end: 55, page: 2 };
      const res = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: {
          sourceId: sharedSourceId,
          content: `Range shape test ${Date.now()}`,
          textRange,
        },
      });
      expect(res.status()).toBe(201);
      const created = await res.json();

      expect(typeof created.textRange).toBe("object");
      expect(created.textRange).not.toBeNull();
      expect(created.textRange.start).toBe(textRange.start);
      expect(created.textRange.end).toBe(textRange.end);
      expect(created.textRange.page).toBe(textRange.page);

      // Clean up
      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("updatedAt should be set after an update", async ({ request }) => {
      const createRes = await request.post(`${API_BASE_URL}/explanations`, {
        headers: { "X-Session-Token": adminToken },
        data: generateExplanation(sharedSourceId),
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();
      expect(created.updatedAt).toBeNull();

      const updateRes = await request.put(
        `${API_BASE_URL}/explanations/${created.id}`,
        {
          headers: { "X-Session-Token": adminToken },
          data: { content: `Updated ${Date.now()}` },
        },
      );
      expect(updateRes.status()).toBe(200);
      const updated = await updateRes.json();
      expect(updated.updatedAt).not.toBeNull();
      expect(typeof updated.updatedAt).toBe("string");

      // Clean up
      await request.delete(`${API_BASE_URL}/explanations/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Full lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Full lifecycle (create, list, update, delete, verify)", () => {
    test("should handle complete explanation lifecycle", async ({ request }) => {
      const explanationIds = [];

      // 1. Create a dedicated source
      const srcRes = await request.post(`${API_BASE_URL}/source/note`, {
        headers: { "X-Session-Token": adminToken },
        data: {
          title: `Lifecycle source ${Date.now()}`,
          content: "Lifecycle content",
        },
      });
      expect(srcRes.status()).toBe(201);
      const source = await srcRes.json();

      // 2. Create multiple explanations
      for (let i = 0; i < 3; i++) {
        const res = await request.post(`${API_BASE_URL}/explanations`, {
          headers: { "X-Session-Token": adminToken },
          data: {
            sourceId: source.id,
            content: `Lifecycle explanation ${i} — ${Date.now()}`,
            textRange: { start: i * 10, end: i * 10 + 9 },
          },
        });
        expect(res.status()).toBe(201);
        explanationIds.push((await res.json()).id);
      }

      // 3. List and verify all appear
      const listRes = await request.get(
        `${API_BASE_URL}/sources/${source.id}/explanations`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(listRes.status()).toBe(200);
      const items = await listRes.json();
      for (const id of explanationIds) {
        expect(items.find((e) => e.id === id)).toBeTruthy();
      }

      // 4. Update each explanation
      for (const id of explanationIds) {
        const updateRes = await request.put(
          `${API_BASE_URL}/explanations/${id}`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { content: `Updated lifecycle content for ${id}` },
          },
        );
        expect(updateRes.status()).toBe(200);
        const updated = await updateRes.json();
        expect(updated.content).toBe(`Updated lifecycle content for ${id}`);
        expect(updated.updatedAt).not.toBeNull();
      }

      // 5. Delete all explanations
      for (const id of explanationIds) {
        const delRes = await request.delete(
          `${API_BASE_URL}/explanations/${id}`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(delRes.status()).toBe(204);
      }

      // 6. Verify list is now empty for this source
      const emptyListRes = await request.get(
        `${API_BASE_URL}/sources/${source.id}/explanations`,
        { headers: { "X-Session-Token": adminToken } },
      );
      expect(emptyListRes.status()).toBe(200);
      const remaining = await emptyListRes.json();
      for (const id of explanationIds) {
        expect(remaining.find((e) => e.id === id)).toBeUndefined();
      }

      // 7. Delete the source
      await request.delete(`${API_BASE_URL}/source/${source.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });
  });
});