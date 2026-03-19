const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://127.0.0.1:5140/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateUser() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    username: `src_test_${id}`,
    email: `src_test_${id}@example.com`,
    password: 'TestPassword123!',
  };
}

async function registerAndLogin(request) {
  const user = generateUser();

  const registerRes = await request.post(`${API_BASE_URL}/auth/register`, {
    data: user,
  });
  expect(registerRes.status(), 'register should succeed').toBe(200);
  const { id: userId } = await registerRes.json();

  const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username: user.username, password: user.password },
  });
  expect(loginRes.status(), 'login should succeed').toBe(200);
  const { token } = await loginRes.json();

  return { token, userId: userId.toString() };
}

function requireFixture(name) {
  const p = path.join(__dirname, name);
  if (!fs.existsSync(p)) throw new Error(`Missing fixture file: ${name}`);
  return fs.readFileSync(p);
}

// ── Test suite ────────────────────────────────────────────────────────────────
// FIX: serial mode ensures every test runs in order, so createdIds is always
// populated before the read/delete tests that depend on it.
test.describe.serial('Source API', () => {
  let token;
  let userId;
  const createdIds = {};

  test.beforeAll(async ({ request }) => {
    requireFixture('sample.html');
    requireFixture('sample.pdf');
    ({ token, userId } = await registerAndLogin(request));
  });

  // ── Create sources ──────────────────────────────────────────────────────

  test('POST /source/url - parses URL and persists rawText', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/source/url`, {
      headers: { 'X-Session-Token': token },
      data: { url: 'https://en.wikipedia.org/wiki/Ant', title: 'Ant Wikipedia' },
    });

    expect(res.ok(), `url source failed: ${await res.text()}`).toBeTruthy();
    const source = await res.json();

    expect(source.id).toBeTruthy();
    expect(source.type).toBe('link');
    expect(source.url).toBe('https://en.wikipedia.org/wiki/Ant');
    expect(source.title).toMatch(/ant/i);
    expect(source.rawText).toBeTruthy();
    expect(source.rawText).toContain('Formicidae');
    expect(source.rawText).toContain('Hymenoptera');

    createdIds.url = source.id;
  });

  test('POST /source/upload - PDF parsed and stored as type "pdf"', async ({ request }) => {
    const buffer = requireFixture('sample.pdf');

    const res = await request.post(`${API_BASE_URL}/source/upload`, {
      headers: { 'X-Session-Token': token },
      multipart: {
        file: { name: 'sample.pdf', mimeType: 'application/pdf', buffer },
        title: 'Ant PDF',
      },
    });

    expect(res.ok(), `pdf upload failed: ${await res.text()}`).toBeTruthy();
    const source = await res.json();

    expect(source.id).toBeTruthy();
    expect(source.type).toBe('pdf');
    expect(source.title).toBe('Ant PDF');
    expect(source.rawText).toBeTruthy();
    expect(source.rawText).toMatch(/ant/i);
    expect(source.rawText).toContain('Hymenoptera');

    createdIds.pdf = source.id;
  });

  test('POST /source/upload - HTML parsed and stored as type "txt"', async ({ request }) => {
    const buffer = requireFixture('sample.html');

    const res = await request.post(`${API_BASE_URL}/source/upload`, {
      headers: { 'X-Session-Token': token },
      multipart: {
        file: { name: 'sample.html', mimeType: 'text/html', buffer },
        title: 'Ant HTML',
      },
    });

    expect(res.ok(), `html upload failed: ${await res.text()}`).toBeTruthy();
    const source = await res.json();

    expect(source.id).toBeTruthy();
    expect(source.type).toBe('txt'); // mapped from "html" to "txt"
    expect(source.title).toBe('Ant HTML');
    expect(source.rawText).toBeTruthy();
    expect(source.rawText).toContain('Formicidae');
    expect(source.rawText).toContain('Hymenoptera');

    createdIds.html = source.id;
  });

  test('POST /source/upload - title falls back to filename when omitted', async ({ request }) => {
    const buffer = requireFixture('sample.pdf');

    const res = await request.post(`${API_BASE_URL}/source/upload`, {
      headers: { 'X-Session-Token': token },
      multipart: {
        file: { name: 'sample.pdf', mimeType: 'application/pdf', buffer },
        // no title field
      },
    });

    expect(res.ok(), `pdf upload (no title) failed: ${await res.text()}`).toBeTruthy();
    const source = await res.json();
    expect(source.title).toBeTruthy();
    expect(source.type).toBe('pdf');
  });

  test('POST /source/note - stores plain text without calling parser', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/source/note`, {
      headers: { 'X-Session-Token': token },
      data: {
        title: 'My Test Note',
        content: 'This is a note about ants. They are eusocial insects.',
      },
    });

    expect(res.ok(), `note creation failed: ${await res.text()}`).toBeTruthy();
    const source = await res.json();

    expect(source.id).toBeTruthy();
    expect(source.type).toBe('note');
    expect(source.title).toBe('My Test Note');
    expect(source.rawText).toBe('This is a note about ants. They are eusocial insects.');

    createdIds.note = source.id;
  });

  // ── Validation errors ───────────────────────────────────────────────────

  test('POST /source/note - rejects empty title', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/source/note`, {
      headers: { 'X-Session-Token': token },
      data: { title: '   ', content: 'Some content' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /source/note - rejects empty content', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/source/note`, {
      headers: { 'X-Session-Token': token },
      data: { title: 'Valid title', content: '' },
    });
    expect(res.status()).toBe(400);
  });

  // ── Read sources ────────────────────────────────────────────────────────
  // Serial execution guarantees all creates above are done before these run.

  test('GET /source - returns all sources for the current user', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/source`, {
      headers: { 'X-Session-Token': token },
    });

    expect(res.ok()).toBeTruthy();
    const sources = await res.json();

    expect(sources.length).toBeGreaterThanOrEqual(4);

    expect(
      sources.find((s) => s.url === 'https://en.wikipedia.org/wiki/Ant'),
      'url source should appear in list'
    ).toBeDefined();
    expect(sources.find((s) => s.title === 'Ant PDF'), 'pdf source should appear in list').toBeDefined();
    expect(sources.find((s) => s.title === 'Ant HTML'), 'html source should appear in list').toBeDefined();
    expect(sources.find((s) => s.title === 'My Test Note'), 'note source should appear in list').toBeDefined();

    // List items should NOT expose heavy fields
    for (const s of sources) {
      expect(s).not.toHaveProperty('rawText');
      expect(s).not.toHaveProperty('rawHtml');
    }
  });

  test('GET /source/:id - returns full source detail for owner', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/source/${createdIds.note}`, {
      headers: { 'X-Session-Token': token },
    });

    expect(res.ok()).toBeTruthy();
    const source = await res.json();

    expect(source.id).toBe(createdIds.note);
    expect(source.type).toBe('note');
    expect(source.rawText).toBeTruthy();
  });

  test('GET /source/:id - returns 404 for non-existent source', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/source/999999`, {
      headers: { 'X-Session-Token': token },
    });
    expect(res.status()).toBe(404);
  });

  test("GET /source/:id - returns 404 when accessing another user's source", async ({ request }) => {
    const { token: token2 } = await registerAndLogin(request);

    // createdIds.note is a real integer - model binding succeeds, service returns null -> 404
    const res = await request.get(`${API_BASE_URL}/source/${createdIds.note}`, {
      headers: { 'X-Session-Token': token2 },
    });
    expect(res.status()).toBe(404);
  });

  // ── Auth guards ─────────────────────────────────────────────────────────

  test('GET /source - returns 401 without auth token', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/source`);
    expect(res.status()).toBe(401);
  });

  test('DELETE /source/:id - returns 401 without auth token', async ({ request }) => {
    // FIX: use a real integer ID so ASP.NET model binding succeeds and the
    // controller's auth check (which runs first) can return 401.
    // With "undefined" in the URL, model binding fails before the auth check
    // runs and the framework returns 400 instead.
    const res = await request.delete(`${API_BASE_URL}/source/${createdIds.note}`);
    expect(res.status()).toBe(401);
  });

  // ── Delete ──────────────────────────────────────────────────────────────

  test('DELETE /source/:id - soft-deletes own source', async ({ request }) => {
    const createRes = await request.post(`${API_BASE_URL}/source/note`, {
      headers: { 'X-Session-Token': token },
      data: { title: 'Delete me', content: 'Temporary content.' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { id: deleteId } = await createRes.json();

    const deleteRes = await request.delete(`${API_BASE_URL}/source/${deleteId}`, {
      headers: { 'X-Session-Token': token },
    });
    expect(deleteRes.status()).toBe(204);

    const getRes = await request.get(`${API_BASE_URL}/source/${deleteId}`, {
      headers: { 'X-Session-Token': token },
    });
    expect(getRes.status()).toBe(404);

    const listRes = await request.get(`${API_BASE_URL}/source`, {
      headers: { 'X-Session-Token': token },
    });
    const list = await listRes.json();
    expect(list.find((s) => s.id === deleteId)).toBeUndefined();
  });

  test("DELETE /source/:id - returns 404 for another user's source", async ({ request }) => {
    const { token: token2 } = await registerAndLogin(request);

    // createdIds.pdf is a real integer set by the upload test above
    const res = await request.delete(`${API_BASE_URL}/source/${createdIds.pdf}`, {
      headers: { 'X-Session-Token': token2 },
    });
    expect(res.status()).toBe(404);
  });
});