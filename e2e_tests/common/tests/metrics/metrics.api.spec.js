// tests/metrics/metrics.api.spec.js
//
// IMPORTANT: serial mode is required because the server uses Argon2 password
// hashing. Running multiple admin logins concurrently across workers causes
// CPU contention and 401 failures. Serial mode gives one worker, one login at
// a time.

import { test, expect } from '@playwright/test';
import {
  API_BASE_URL,
  generateUser,
  registerUser,
  login,
  loginAsAdmin,
  deleteUser,
  generateTraffic,
  recentRange,
} from './metrics-helpers.js';

test.describe.configure({ mode: 'serial' });

// ─── shared admin token (one login for the whole file) ────────────────────────

let adminToken;

test.beforeAll(async ({ request }) => {
  adminToken = await loginAsAdmin(request);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AUTHENTICATION & AUTHORIZATION
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Metrics – auth & authorization', () => {
  const endpoints = [
    '/admin/metrics/requests',
    '/admin/metrics/errors',
    '/admin/metrics/latency',
  ];

  for (const path of endpoints) {
    test(`GET ${path} → 401 when no token`, async ({ request }) => {
      const res = await request.get(`${API_BASE_URL}${path}`);
      expect(res.status()).toBe(401);
    });

    test(`GET ${path} → 403 when regular user`, async ({ request }) => {
      const userData = generateUser();
      const created  = await registerUser(request, userData);
      const token    = await login(request, userData.username, userData.password);

      try {
        const res = await request.get(`${API_BASE_URL}${path}`, {
          headers: { 'X-Session-Token': token },
        });
        expect([401, 403]).toContain(res.status());
      } finally {
        await deleteUser(request, adminToken, created.id);
      }
    });

    test(`GET ${path} → 200 for admin`, async ({ request }) => {
      const res = await request.get(`${API_BASE_URL}${path}`, {
        headers: { 'X-Session-Token': adminToken },
      });
      expect(res.status()).toBe(200);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RESPONSE CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Metrics – response contract', () => {
  test('GET /requests returns an array', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/requests?${recentRange(24)}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test('GET /errors returns an array', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/errors?${recentRange(24)}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test('GET /latency returns an array', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/latency?${recentRange(24)}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test('/requests rows have timestamp and value fields', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/requests?${recentRange(168)}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    if (body.length > 0) {
      const row = body[0];
      expect(row).toHaveProperty('timestamp');
      expect(row).toHaveProperty('value');
      expect(typeof row.value).toBe('number');
      expect(new Date(row.timestamp).getTime()).not.toBeNaN();
    }
  });

  test('/latency rows have timestamp plus avg or p95', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/latency?${recentRange(168)}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    if (body.length > 0) {
      const row = body[0];
      expect(row).toHaveProperty('timestamp');
      expect(new Date(row.timestamp).getTime()).not.toBeNaN();
      expect('avg' in row || 'p95' in row).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DATE-RANGE FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Metrics – date-range filtering', () => {
  test('future range returns empty array for /requests', async ({ request }) => {
    const { from, to } = futureRange();
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/requests?from=${from}&to=${to}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('future range returns empty array for /errors', async ({ request }) => {
    const { from, to } = futureRange();
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/errors?from=${from}&to=${to}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('future range returns empty array for /latency', async ({ request }) => {
    const { from, to } = futureRange();
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/latency?from=${from}&to=${to}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('results are ordered by timestamp ascending', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/requests?${recentRange(168)}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    for (let i = 1; i < body.length; i++) {
      const prev = new Date(body[i - 1].timestamp).getTime();
      const curr = new Date(body[i].timestamp).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  test('narrower range is always a subset of wider range', async ({ request }) => {
    const [wideRes, narrowRes] = await Promise.all([
      request.get(`${API_BASE_URL}/admin/metrics/requests?${recentRange(168)}`,
        { headers: { 'X-Session-Token': adminToken } }),
      request.get(`${API_BASE_URL}/admin/metrics/requests?${recentRange(1)}`,
        { headers: { 'X-Session-Token': adminToken } }),
    ]);
    expect(wideRes.status()).toBe(200);
    expect(narrowRes.status()).toBe(200);
    expect((await narrowRes.json()).length).toBeLessThanOrEqual((await wideRes.json()).length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MIDDLEWARE TRANSPARENCY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Metrics – middleware does not break requests', () => {
  let createdUser;
  let userToken;

  test.beforeEach(async ({ request }) => {
    const userData = generateUser();
    createdUser    = await registerUser(request, userData);
    userToken      = await login(request, userData.username, userData.password);
  });

  test.afterEach(async ({ request }) => {
    await deleteUser(request, adminToken, createdUser.id);
  });

  test('normal requests still return correct status codes', async ({ request }) => {
    const meRes = await request.get(`${API_BASE_URL}/users/me`, {
      headers: { 'X-Session-Token': userToken },
    });
    expect(meRes.status()).toBe(200);

    const badLogin = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: '__no_such__', password: 'wrong' },
    });
    expect(badLogin.status()).toBe(401);

    const notFound = await request.get(`${API_BASE_URL}/notes/999999999`, {
      headers: { 'X-Session-Token': userToken },
    });
    expect(notFound.status()).toBe(404);
  });

  test('metrics endpoints stay responsive after a traffic burst', async ({ request }) => {
    await generateTraffic(request, userToken);

    const res = await request.get(
      `${API_BASE_URL}/admin/metrics/requests?${recentRange(1)}`,
      { headers: { 'X-Session-Token': adminToken } },
    );
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

// ─── private helpers ──────────────────────────────────────────────────────────

function futureRange() {
  const base = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    from: new Date(base.getTime() - 60_000).toISOString(),
    to:   base.toISOString(),
  };
}