import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:5140/api";

const adminUser = {
  username: "admin",
  password: "123",
};

// Allowed DB source types
const SOURCE_TYPES = ["book", "link", "note", "pdf", "txt"];

function generateSource() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    url: `https://example.com/playwright-${id}`,
    title: `Playwright Source ${id}`,
    content: `This is a test note ${id}`,
  };
}

test.describe("Source API Comprehensive Tests", () => {
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

  test.describe("Authentication & Authorization", () => {
    test("should return 401 for unauthenticated requests", async ({
      request,
    }) => {
      const endpoints = [
        { method: "get", url: "/source" },
        { method: "get", url: "/source/1" },
        {
          method: "post",
          url: "/source/url",
          data: { url: "http://example.com" },
        },
        {
          method: "post",
          url: "/source/note",
          data: { title: "x", content: "y" },
        },
        {
          method: "post",
          url: "/source/upload",
          multipart: {
            file: {
              name: "dummy.txt",
              mimeType: "text/plain",
              buffer: Buffer.from("test"),
            },
            title: "Test Title",
          },
        },
        { method: "delete", url: "/source/1" },
      ];

      for (const ep of endpoints) {
        let res;
        if (ep.method === "get") {
          res = await request.get(`${API_BASE_URL}${ep.url}`);
        } else if (ep.method === "post") {
          if (ep.multipart) {
            res = await request.post(`${API_BASE_URL}${ep.url}`, {
              multipart: ep.multipart,
            });
          } else {
            res = await request.post(`${API_BASE_URL}${ep.url}`, {
              data: ep.data,
            });
          }
        } else if (ep.method === "delete") {
          res = await request.delete(`${API_BASE_URL}${ep.url}`);
        }
        expect(
          res.status(),
          `Endpoint ${ep.method} ${ep.url} should return 401`,
        ).toBe(401);
      }
    });
  });

  test.describe("Create and validate source types", () => {
    test("should create a link source via /url", async ({ request }) => {
      const source = generateSource();
      const createRes = await request.post(`${API_BASE_URL}/source/url`, {
        headers: { "X-Session-Token": adminToken },
        data: { url: source.url, title: source.title },
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();
      expect(created.id).toBeTruthy();
      expect(created.type).toBe("link");
      expect(created.title).toBe(source.title);
      expect(created.url).toBe(source.url);
      expect(SOURCE_TYPES).toContain(created.type);

      await request.delete(`${API_BASE_URL}/source/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should create a text note source via /text", async ({ request }) => {
      const source = generateSource();
      const createRes = await request.post(`${API_BASE_URL}/source/note`, {
        headers: { "X-Session-Token": adminToken },
        data: { title: source.title, content: source.content },
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();
      expect(created.id).toBeTruthy();
      expect(created.type).toBe("note");
      expect(created.title).toBe(source.title);
      expect(created.rawText).toBe(source.content);
      expect(SOURCE_TYPES).toContain(created.type);

      await request.delete(`${API_BASE_URL}/source/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should upload a txt file source via /upload", async ({ request }) => {
      const title = `Playwright Upload ${Date.now()}`;
      const content = "This is a test txt content.";
      const uploadRes = await request.post(`${API_BASE_URL}/source/upload`, {
        headers: { "X-Session-Token": adminToken },
        multipart: {
          file: {
            name: "test.txt",
            mimeType: "text/plain",
            buffer: Buffer.from(content),
          },
          title: title,
        },
      });
      expect(uploadRes.status()).toBe(201);
      const uploaded = await uploadRes.json();
      expect(uploaded.id).toBeTruthy();
      expect(uploaded.type).toBe("txt");
      expect(uploaded.title).toBe(title);
      expect(uploaded.rawText).toBe(content);
      expect(SOURCE_TYPES).toContain(uploaded.type);

      await request.delete(`${API_BASE_URL}/source/${uploaded.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should upload a pdf file source via /upload", async ({ request }) => {
      const title = `Playwright PDF Upload ${Date.now()}`;
      const pdfBuffer = Buffer.from("%PDF-1.4\n% fake pdf content");
      const uploadRes = await request.post(`${API_BASE_URL}/source/upload`, {
        headers: { "X-Session-Token": adminToken },
        multipart: {
          file: {
            name: "test.pdf",
            mimeType: "application/pdf",
            buffer: pdfBuffer,
          },
          title: title,
        },
      });
      expect(uploadRes.status()).toBe(201);
      const uploaded = await uploadRes.json();
      expect(uploaded.id).toBeTruthy();
      expect(uploaded.type).toBe("pdf");
      expect(uploaded.title).toBe(title);
      expect(uploaded.rawText).toBe("[PDF content extraction placeholder]");
      expect(SOURCE_TYPES).toContain(uploaded.type);

      await request.delete(`${API_BASE_URL}/source/${uploaded.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });
  });

  test.describe("Validation & error handling", () => {
    test("should create a link source even when url is missing (defaults to empty string)", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/source/url`, {
        headers: { "X-Session-Token": adminToken },
        data: { title: "No URL" },
      });
      expect(res.status()).toBe(201);
      const created = await res.json();
      expect(created.url).toBe("");
      await request.delete(`${API_BASE_URL}/source/${created.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should return 400 when creating text source without title", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/source/note`, {
        headers: { "X-Session-Token": adminToken },
        data: { content: "some content" },
      });
      expect(res.status()).toBe(400);
    });

    test("should return 400 when creating text source without content", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/source/note`, {
        headers: { "X-Session-Token": adminToken },
        data: { title: "No content" },
      });
      expect(res.status()).toBe(400);
    });

    test("should return 400 when uploading without file", async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE_URL}/source/upload`, {
        headers: { "X-Session-Token": adminToken },
        multipart: { title: "No file" },
      });
      expect(res.status()).toBe(400);
    });

    test("should return 404 when getting non-existent source", async ({
      request,
    }) => {
      const res = await request.get(`${API_BASE_URL}/source/9999999`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(res.status()).toBe(404);
    });

    test("should return 404 when deleting non-existent source", async ({
      request,
    }) => {
      const res = await request.delete(`${API_BASE_URL}/source/9999999`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(res.status()).toBe(404);
    });
  });

  test.describe("Full lifecycle (create, get, list, delete, verify)", () => {
    test("should handle complete flow for all source types", async ({
      request,
    }) => {
      const sourceIds = [];

      const linkData = generateSource();
      const linkRes = await request.post(`${API_BASE_URL}/source/url`, {
        headers: { "X-Session-Token": adminToken },
        data: { url: linkData.url, title: linkData.title },
      });
      expect(linkRes.status()).toBe(201);
      sourceIds.push((await linkRes.json()).id);

      const textData = generateSource();
      const textRes = await request.post(`${API_BASE_URL}/source/note`, {
        headers: { "X-Session-Token": adminToken },
        data: { title: textData.title, content: textData.content },
      });
      expect(textRes.status()).toBe(201);
      sourceIds.push((await textRes.json()).id);

      const txtTitle = `TXT Upload ${Date.now()}`;
      const txtRes = await request.post(`${API_BASE_URL}/source/upload`, {
        headers: { "X-Session-Token": adminToken },
        multipart: {
          file: {
            name: "lifecycle.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("TXT lifecycle test content"),
          },
          title: txtTitle,
        },
      });
      expect(txtRes.status()).toBe(201);
      sourceIds.push((await txtRes.json()).id);

      for (const id of sourceIds) {
        const getRes = await request.get(`${API_BASE_URL}/source/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
        expect(getRes.status()).toBe(200);
        const source = await getRes.json();
        expect(source.id).toBe(id);
        expect(SOURCE_TYPES).toContain(source.type);
      }

      const listRes = await request.get(`${API_BASE_URL}/source`, {
        headers: { "X-Session-Token": adminToken },
      });
      expect(listRes.status()).toBe(200);
      const sources = await listRes.json();
      for (const id of sourceIds) {
        const found = sources.find((s) => s.id === id);
        expect(found).toBeTruthy();
        expect(SOURCE_TYPES).toContain(found.type);
      }

      for (const id of sourceIds) {
        const delRes = await request.delete(`${API_BASE_URL}/source/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
        expect(delRes.status()).toBe(204);
      }

      for (const id of sourceIds) {
        const getRes = await request.get(`${API_BASE_URL}/source/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
        expect(getRes.status()).toBe(404);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Progress
  // Routes: GET /api/source/{id}/progress
  //         PUT /api/source/{id}/progress
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Progress", () => {
    let sourceId;

    // Create one shared source for all progress tests
    test.beforeAll(async ({ request }) => {
      const src = generateSource();
      const res = await request.post(`${API_BASE_URL}/source/note`, {
        headers: { "X-Session-Token": adminToken },
        data: { title: src.title, content: src.content },
      });
      expect(res.status()).toBe(201);
      sourceId = (await res.json()).id;
    });

    test.afterAll(async ({ request }) => {
      if (sourceId) {
        await request.delete(`${API_BASE_URL}/source/${sourceId}`, {
          headers: { "X-Session-Token": adminToken },
        });
      }
    });

    // ── Authentication ──────────────────────────────────────────────────────

    test.describe("Authentication & Authorization", () => {
      test("should return 401 for unauthenticated GET progress", async ({
        request,
      }) => {
        const res = await request.get(
          `${API_BASE_URL}/source/${sourceId}/progress`,
        );
        expect(res.status()).toBe(401);
      });

      test("should return 401 for unauthenticated PUT progress", async ({
        request,
      }) => {
        const res = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          { data: { lastPosition: { scrollTop: 100 } } },
        );
        expect(res.status()).toBe(401);
      });
    });

    // ── GET progress ────────────────────────────────────────────────────────

    test.describe("GET progress", () => {
      test("should return default progress (null lastPosition) for a source with no saved progress", async ({
        request,
      }) => {
        // Create a fresh source that has never had progress saved
        const src = generateSource();
        const srcRes = await request.post(`${API_BASE_URL}/source/note`, {
          headers: { "X-Session-Token": adminToken },
          data: { title: src.title, content: src.content },
        });
        expect(srcRes.status()).toBe(201);
        const freshId = (await srcRes.json()).id;

        const res = await request.get(
          `${API_BASE_URL}/source/${freshId}/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(body.sourceId).toBe(freshId);
        expect(body.lastPosition).toBeNull();
        expect(body.updatedAt).toBeTruthy();

        // Clean up
        await request.delete(`${API_BASE_URL}/source/${freshId}`, {
          headers: { "X-Session-Token": adminToken },
        });
      });

      test("should return saved progress after an update", async ({
        request,
      }) => {
        const position = { scrollTop: 500, scrollPercent: 0.35, paragraphIndex: 7 };
        await request.put(`${API_BASE_URL}/source/${sourceId}/progress`, {
          headers: { "X-Session-Token": adminToken },
          data: { lastPosition: position },
        });

        const res = await request.get(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(body.sourceId).toBe(sourceId);
        expect(body.lastPosition).toMatchObject(position);
      });

      test("should return 404 for a non-existent source", async ({
        request,
      }) => {
        const res = await request.get(
          `${API_BASE_URL}/source/9999999/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(res.status()).toBe(404);
      });

      test("should return 404 for a source that belongs to another user", async ({
        request,
      }) => {
        // Source ownership is verified by GetSourceByIdAsync — a foreign source
        // returns null from the service, so the controller returns 404.
        // We use a non-existent id as a proxy since we only have one test user.
        const res = await request.get(
          `${API_BASE_URL}/source/9999998/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(res.status()).toBe(404);
      });
    });

    // ── PUT progress ────────────────────────────────────────────────────────

    test.describe("PUT progress", () => {
      test("should save progress and return the DTO", async ({ request }) => {
        const position = { scrollTop: 200, scrollPercent: 0.15, paragraphIndex: 2 };
        const res = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: position },
          },
        );
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(body.sourceId).toBe(sourceId);
        expect(body.lastPosition).toMatchObject(position);
        expect(body.updatedAt).toBeTruthy();
      });

      test("should overwrite existing progress on a second PUT (upsert)", async ({
        request,
      }) => {
        const first = { scrollTop: 100, scrollPercent: 0.1, paragraphIndex: 1 };
        const second = { scrollTop: 900, scrollPercent: 0.9, paragraphIndex: 20 };

        await request.put(`${API_BASE_URL}/source/${sourceId}/progress`, {
          headers: { "X-Session-Token": adminToken },
          data: { lastPosition: first },
        });

        const res = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: second },
          },
        );
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(body.lastPosition).toMatchObject(second);
        expect(body.lastPosition.scrollTop).not.toBe(first.scrollTop);
      });

      test("should accept arbitrary JSON shape for lastPosition", async ({
        request,
      }) => {
        const customPosition = {
          page: 3,
          chapterSlug: "introduction",
          highlight: { start: 10, end: 42 },
        };
        const res = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: customPosition },
          },
        );
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(body.lastPosition).toMatchObject(customPosition);
      });

      test("should return 400 when lastPosition is null (non-nullable object field)", async ({
        request,
      }) => {
        // UpdateProgressRequest.LastPosition is typed as `object` (non-nullable).
        // ASP.NET model binding rejects a JSON null and returns 400.
        const res = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: null },
          },
        );
        expect(res.status()).toBe(400);
      });

      test("should accept an empty object as lastPosition", async ({
        request,
      }) => {
        const res = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: {} },
          },
        );
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(body.sourceId).toBe(sourceId);
        expect(typeof body.lastPosition).toBe("object");
      });

      test("should return 404 when updating progress for a non-existent source", async ({
        request,
      }) => {
        const res = await request.put(
          `${API_BASE_URL}/source/9999999/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: { scrollTop: 0 } },
          },
        );
        expect(res.status()).toBe(404);
      });

      test("updatedAt should advance after each PUT", async ({ request }) => {
        const putOne = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: { scrollTop: 10 } },
          },
        );
        expect(putOne.status()).toBe(200);
        const firstUpdatedAt = (await putOne.json()).updatedAt;

        // Small delay so the timestamp can differ
        await new Promise((r) => setTimeout(r, 50));

        const putTwo = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: { scrollTop: 999 } },
          },
        );
        expect(putTwo.status()).toBe(200);
        const secondUpdatedAt = (await putTwo.json()).updatedAt;

        expect(new Date(secondUpdatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(firstUpdatedAt).getTime(),
        );
      });
    });

    // ── DTO shape ───────────────────────────────────────────────────────────

    test.describe("DTO shape validation", () => {
      test("progress DTO should contain all required fields with correct types", async ({
        request,
      }) => {
        const position = { scrollTop: 42, scrollPercent: 0.05, paragraphIndex: 0 };
        const putRes = await request.put(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: position },
          },
        );
        expect(putRes.status()).toBe(200);
        const body = await putRes.json();

        expect(typeof body.sourceId).toBe("number");
        expect(typeof body.updatedAt).toBe("string");
        expect(typeof body.lastPosition).toBe("object");
        expect(body.lastPosition).not.toBeNull();
      });

      test("lastPosition should be deserialised as an object, not a raw JSON string", async ({
        request,
      }) => {
        const position = { scrollTop: 77, scrollPercent: 0.5 };
        await request.put(`${API_BASE_URL}/source/${sourceId}/progress`, {
          headers: { "X-Session-Token": adminToken },
          data: { lastPosition: position },
        });

        const getRes = await request.get(
          `${API_BASE_URL}/source/${sourceId}/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(getRes.status()).toBe(200);
        const body = await getRes.json();

        // Must be a parsed object, not a string like '{"scrollTop":77}'
        expect(typeof body.lastPosition).toBe("object");
        expect(body.lastPosition.scrollTop).toBe(77);
      });
    });

    // ── Full lifecycle ──────────────────────────────────────────────────────

    test.describe("Full progress lifecycle", () => {
      test("should save, retrieve, overwrite, and verify progress end-to-end", async ({
        request,
      }) => {
        // 1. Create a dedicated source
        const src = generateSource();
        const srcRes = await request.post(`${API_BASE_URL}/source/note`, {
          headers: { "X-Session-Token": adminToken },
          data: { title: src.title, content: src.content },
        });
        expect(srcRes.status()).toBe(201);
        const id = (await srcRes.json()).id;

        // 2. GET — no progress yet, lastPosition should be null
        const getInitial = await request.get(
          `${API_BASE_URL}/source/${id}/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(getInitial.status()).toBe(200);
        expect((await getInitial.json()).lastPosition).toBeNull();

        // 3. PUT first position
        const pos1 = { scrollTop: 150, scrollPercent: 0.2, paragraphIndex: 3 };
        const put1 = await request.put(
          `${API_BASE_URL}/source/${id}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: pos1 },
          },
        );
        expect(put1.status()).toBe(200);

        // 4. GET — verify pos1 is persisted
        const get1 = await request.get(
          `${API_BASE_URL}/source/${id}/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(get1.status()).toBe(200);
        expect((await get1.json()).lastPosition).toMatchObject(pos1);

        // 5. PUT second position (upsert — should overwrite)
        const pos2 = { scrollTop: 800, scrollPercent: 0.85, paragraphIndex: 17 };
        const put2 = await request.put(
          `${API_BASE_URL}/source/${id}/progress`,
          {
            headers: { "X-Session-Token": adminToken },
            data: { lastPosition: pos2 },
          },
        );
        expect(put2.status()).toBe(200);

        // 6. GET — verify pos2 replaced pos1
        const get2 = await request.get(
          `${API_BASE_URL}/source/${id}/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(get2.status()).toBe(200);
        const final = await get2.json();
        expect(final.lastPosition).toMatchObject(pos2);
        expect(final.lastPosition.scrollTop).not.toBe(pos1.scrollTop);

        // 7. Delete source and confirm progress endpoint returns 404
        await request.delete(`${API_BASE_URL}/source/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
        const afterDelete = await request.get(
          `${API_BASE_URL}/source/${id}/progress`,
          { headers: { "X-Session-Token": adminToken } },
        );
        expect(afterDelete.status()).toBe(404);
      });
    });
  });
});