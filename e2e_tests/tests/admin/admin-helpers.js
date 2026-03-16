import { test, expect } from '@playwright/test';

export const FRONTEND_URL = 'http://localhost:4000';
export const API_BASE_URL = 'http://localhost:3001/api';
export const ADMIN_USER = { username: 'admin', password: '123' };

export function generateUser() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    username: `user_${id}`,
    email: `user_${id}@example.com`,
    password: 'TestPassword123!',
  };
}

export async function registerUser(request, user) {
  const res = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      username: user.username,
      email: user.email,
      password: user.password,
    },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body; // includes id, username, email
}

export async function login(request, username, password) {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username, password },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.token;
}

export async function loginAsAdmin(request) {
  const token = await login(request, ADMIN_USER.username, ADMIN_USER.password);
  
  // Verify the token belongs to an admin user
  const meRes = await request.get(`${API_BASE_URL}/users/me`, {
    headers: { 'X-Session-Token': token },
  });
  expect(meRes.status()).toBe(200);
  const user = await meRes.json();
  if (user.role !== 'admin') {
    throw new Error(`Admin user does not have admin role. Current role: ${user.role}`);
  }
  
  return token;
}

export async function createQuiz(request, token, title = 'Test Quiz') {
  const res = await request.post(`${API_BASE_URL}/quiz`, {
    headers: { 'X-Session-Token': token },
    data: {
      title,
      description: 'Test description',
      visibility: 'private',
    },
  });
  expect(res.status()).toBe(201);
  const quiz = await res.json();
  return quiz;
}

export async function createComment(request, token, targetType, targetId, content, parentId = null) {
  const res = await request.post(`${API_BASE_URL}/comments`, {
    headers: { 'X-Session-Token': token },
    data: {
      targetType,
      targetId,
      content,
      parentId,
    },
  });
  expect(res.status()).toBe(201);
  const comment = await res.json();
  return comment;
}

export async function deleteUser(request, adminToken, userId) {
  const res = await request.delete(`${API_BASE_URL}/users/${userId}`, {
    headers: { 'X-Session-Token': adminToken },
  });
  expect(res.status()).toBe(200);
}

export async function createAuthenticatedPage(browser, token) {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set token before navigation
  await page.addInitScript((sessionToken) => {
    localStorage.setItem('session_token', sessionToken);
  }, token);
  
  // Navigate and wait for either admin page or redirect
  await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle' });
  
  // Check current URL
  const url = page.url();
  if (url.includes('/dashboard')) {
    console.error(`Redirected to dashboard. Token may be invalid or user not admin.`);
    // Optionally capture console logs for debugging
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    throw new Error('Redirected to dashboard – user not authenticated as admin');
  }
  
  // Wait for admin tab to appear
  await expect(page.locator('[data-testid="admin-tab-users"]')).toBeVisible({ timeout: 10000 });
  
  return page;
}