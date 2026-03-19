// tests/metrics/metrics-helpers.js

export const API_BASE_URL = 'http://localhost:5140/api';

export const ADMIN_USER = { username: 'admin', password: '123' };

export function generateUser() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    username: `user_${id}`,
    email:    `user_${id}@example.com`,
    password: 'TestPassword123!',
  };
}

export async function registerUser(request, user) {
  const res = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      username: user.username,
      email:    user.email,
      password: user.password,
    },
  });
  if (res.status() !== 200) throw new Error(`Register failed: ${res.status()}`);
  return res.json();
}

export async function login(request, username, password) {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username, password },
  });
  if (res.status() !== 200) throw new Error(`Login failed: ${res.status()}`);
  const body = await res.json();
  return body.token;
}

export async function loginAsAdmin(request) {
  return login(request, ADMIN_USER.username, ADMIN_USER.password);
}

export async function deleteUser(request, adminToken, userId) {
  const res = await request.delete(`${API_BASE_URL}/users/${userId}`, {
    headers: { 'X-Session-Token': adminToken },
  });
  if (res.status() !== 200) throw new Error(`Delete user failed: ${res.status()}`);
}

/**
 * Hit several endpoints to generate request/error traffic that the
 * MetricsMiddleware will record into Redis. The flush to Postgres happens
 * on the background service schedule, so these helpers are used by tests
 * that only verify the Redis-side behaviour or the endpoint contract.
 */
export async function generateTraffic(request, token) {
  // successful requests
  await request.get(`${API_BASE_URL}/users/me`, {
    headers: { 'X-Session-Token': token },
  });
  await request.get(`${API_BASE_URL}/users/me`, {
    headers: { 'X-Session-Token': token },
  });

  // 4xx error requests (bad login → 401 recorded as error by middleware)
  await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username: '__no_such_user__', password: 'wrong' },
  });

  // 404 (non-existent resource)
  await request.get(`${API_BASE_URL}/notes/999999999`, {
    headers: { 'X-Session-Token': token },
  });
}

/**
 * Build a ?from=&to= query string spanning the last N hours.
 */
export function recentRange(hours = 1) {
  const to   = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  return `from=${from.toISOString()}&to=${to.toISOString()}`;
}