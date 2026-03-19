import { test, expect } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:5140/api';
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
  return login(request, ADMIN_USER.username, ADMIN_USER.password);
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
  expect(res.status()).toBe(201);  // Changed from 200 to 201
  const quiz = await res.json();
  return quiz; // contains id
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

export async function createReport(request, token, targetType, targetId, reason) {
  const res = await request.post(`${API_BASE_URL}/reports`, {
    headers: { 'X-Session-Token': token },
    data: {
      targetType,
      targetId,
      reason,
    },
  });
  expect(res.status()).toBe(201);
  const report = await res.json();
  return report;
}

export async function deleteUser(request, adminToken, userId) {
  const res = await request.delete(`${API_BASE_URL}/users/${userId}`, {
    headers: { 'X-Session-Token': adminToken },
  });
  expect(res.status()).toBe(200);
}