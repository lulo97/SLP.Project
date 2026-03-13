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

      // Clean up
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

      // Clean up
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

      // Clean up
      await request.delete(`${API_BASE_URL}/source/${uploaded.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });

    test("should upload a pdf file source via /upload", async ({ request }) => {
      const title = `Playwright PDF Upload ${Date.now()}`;
      // Mock a simple PDF buffer (just a placeholder)
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

      // Clean up
      await request.delete(`${API_BASE_URL}/source/${uploaded.id}`, {
        headers: { "X-Session-Token": adminToken },
      });
    });
  });

  test.describe("Validation & error handling", () => {
    test("should create a link source even when url is missing (defaults to empty string)", async ({
      request,
    }) => {
      // Backend does not validate non-empty URL, so it creates a source with empty url.
      const res = await request.post(`${API_BASE_URL}/source/url`, {
        headers: { "X-Session-Token": adminToken },
        data: { title: "No URL" }, // url omitted, defaults to empty string
      });
      expect(res.status()).toBe(201);
      const created = await res.json();
      expect(created.url).toBe(""); // url is empty string
      // Clean up
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
        multipart: {
          title: "No file",
        },
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

      // 1. Create link source
      const linkData = generateSource();
      const linkRes = await request.post(`${API_BASE_URL}/source/url`, {
        headers: { "X-Session-Token": adminToken },
        data: { url: linkData.url, title: linkData.title },
      });
      expect(linkRes.status()).toBe(201);
      const linkSource = await linkRes.json();
      sourceIds.push(linkSource.id);

      // 2. Create Note Source
      const textData = generateSource();
      const textRes = await request.post(`${API_BASE_URL}/source/note`, {
        headers: { "X-Session-Token": adminToken },
        data: { title: textData.title, content: textData.content },
      });
      expect(textRes.status()).toBe(201);
      const textSource = await textRes.json();
      sourceIds.push(textSource.id);

      // 3. Upload txt source
      const txtTitle = `TXT Upload ${Date.now()}`;
      const txtContent = "TXT lifecycle test content";
      const txtRes = await request.post(`${API_BASE_URL}/source/upload`, {
        headers: { "X-Session-Token": adminToken },
        multipart: {
          file: {
            name: "lifecycle.txt",
            mimeType: "text/plain",
            buffer: Buffer.from(txtContent),
          },
          title: txtTitle,
        },
      });
      expect(txtRes.status()).toBe(201);
      const txtSource = await txtRes.json();
      sourceIds.push(txtSource.id);

      // 4. Get each source and verify
      for (const id of sourceIds) {
        const getRes = await request.get(`${API_BASE_URL}/source/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
        expect(getRes.status()).toBe(200);
        const source = await getRes.json();
        expect(source.id).toBe(id);
        expect(SOURCE_TYPES).toContain(source.type);
      }

      // 5. List all sources and verify they appear
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

      // 6. Delete each source
      for (const id of sourceIds) {
        const delRes = await request.delete(`${API_BASE_URL}/source/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
        expect(delRes.status()).toBe(204);
      }

      // 7. Verify each is gone (404)
      for (const id of sourceIds) {
        const getRes = await request.get(`${API_BASE_URL}/source/${id}`, {
          headers: { "X-Session-Token": adminToken },
        });
        expect(getRes.status()).toBe(404);
      }
    });
  });
});
