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
  };
}

test.describe("Source lifecycle flow", () => {

  test("admin login → create url source → get → upload → delete → verify deleted", async ({ request }) => {

    let adminToken;
    let sourceId;
    let uploadSourceId;

    const source = generateSource();

    // -----------------------------
    // 1. Admin login
    // -----------------------------
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });

    expect(loginRes.status()).toBe(200);

    const loginBody = await loginRes.json();
    expect(loginBody.token).toBeTruthy();

    adminToken = loginBody.token;

    // -----------------------------
    // 2. Create source from URL
    // -----------------------------
    const createRes = await request.post(`${API_BASE_URL}/source/url`, {
      headers: {
        "X-Session-Token": adminToken,
      },
      data: source,
    });

    expect(createRes.status()).toBe(201);

    const createdSource = await createRes.json();

    expect(createdSource.id).toBeTruthy();
    expect(createdSource.title).toBe(source.title);
    expect(createdSource.url).toBe(source.url);

    // Validate type against DB constraint
    expect(SOURCE_TYPES).toContain(createdSource.type);
    expect(createdSource.type).toBe("link");

    sourceId = createdSource.id;

    // -----------------------------
    // 3. Get source
    // -----------------------------
    const getRes = await request.get(`${API_BASE_URL}/source/${sourceId}`, {
      headers: {
        "X-Session-Token": adminToken,
      },
    });

    expect(getRes.status()).toBe(200);

    const getSource = await getRes.json();

    expect(getSource.id).toBe(sourceId);
    expect(getSource.title).toBe(source.title);
    expect(SOURCE_TYPES).toContain(getSource.type);

    // -----------------------------
    // 4. Get my sources
    // -----------------------------
    const listRes = await request.get(`${API_BASE_URL}/source`, {
      headers: {
        "X-Session-Token": adminToken,
      },
    });

    expect(listRes.status()).toBe(200);

    const sources = await listRes.json();

    expect(Array.isArray(sources)).toBeTruthy();

    const found = sources.find((s) => s.id === sourceId);

    expect(found).toBeTruthy();
    expect(SOURCE_TYPES).toContain(found.type);

    // -----------------------------
    // 5. Upload TXT file
    // -----------------------------
    const uploadRes = await request.post(`${API_BASE_URL}/source/upload`, {
      headers: {
        "X-Session-Token": adminToken,
      },
      multipart: {
        file: {
          name: "playwright.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("Playwright upload test content"),
        },
        title: `Playwright Upload ${Date.now()}`,
      },
    });

    expect(uploadRes.status()).toBe(201);

    const uploadSource = await uploadRes.json();

    expect(uploadSource.id).toBeTruthy();

    // Validate DB allowed types
    expect(SOURCE_TYPES).toContain(uploadSource.type);
    expect(uploadSource.type).toBe("txt");

    uploadSourceId = uploadSource.id;

    // -----------------------------
    // 6. Delete uploaded source
    // -----------------------------
    const deleteUploadRes = await request.delete(
      `${API_BASE_URL}/source/${uploadSourceId}`,
      {
        headers: {
          "X-Session-Token": adminToken,
        },
      }
    );

    expect(deleteUploadRes.status()).toBe(204);

    // -----------------------------
    // 7. Delete URL source
    // -----------------------------
    const deleteRes = await request.delete(
      `${API_BASE_URL}/source/${sourceId}`,
      {
        headers: {
          "X-Session-Token": adminToken,
        },
      }
    );

    expect(deleteRes.status()).toBe(204);

    // -----------------------------
    // 8. Verify deleted (no auth)
    // -----------------------------
    const getAfterDeleteRes = await request.get(
      `${API_BASE_URL}/source/${sourceId}`
    );

    expect(getAfterDeleteRes.status()).toBe(401);

    // -----------------------------
    // 9. Verify deleted (with auth)
    // -----------------------------
    const getAfterDeleteAuthRes = await request.get(
      `${API_BASE_URL}/source/${sourceId}`,
      {
        headers: {
          "X-Session-Token": adminToken,
        },
      }
    );

    expect(getAfterDeleteAuthRes.status()).toBe(404);

  });

});