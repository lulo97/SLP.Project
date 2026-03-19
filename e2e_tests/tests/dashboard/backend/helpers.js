// e2e_tests/tests/dashboard/dashboard-helpers.js
import { expect } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:5140/api';
export const ADMIN_USER = { username: 'admin', password: '123' };

export async function loginAsAdmin(request) {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username: ADMIN_USER.username, password: ADMIN_USER.password },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.token;
}

export function authHeaders(token) {
  return { 'X-Session-Token': token };
}

// ── Quiz creation (for top quizzes) ──────────────────────────────────────────

export async function createQuiz(request, token, title = null, prefix = null) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  const effectivePrefix = prefix || `dashboard-api-test-${id}`;
  const quizTitle = title || `${effectivePrefix} Quiz ${id}`;
  const quizData = {
    title: quizTitle,
    description: 'Quiz for dashboard API test',
    visibility: 'public',
    tagNames: [effectivePrefix], // optional, still included
  };
  const res = await request.post(`${API_BASE_URL}/quiz`, {
    headers: authHeaders(token),
    data: quizData,
  });
  expect(res.status()).toBe(201);
  const quiz = await res.json();
  return { id: quiz.id, title: quiz.title };
}

export async function addQuestionToQuiz(request, token, quizId) {
  const snapshot = {
    type: 'multiple_choice',
    content: 'Sample question',
    metadata: {
      options: [
        { id: '0', text: 'Option A' },
        { id: '1', text: 'Option B' },
        { id: '2', text: 'Option C' },
      ],
      correctAnswers: ['0'],
    },
  };
  const res = await request.post(`${API_BASE_URL}/quiz/${quizId}/questions`, {
    headers: authHeaders(token),
    data: {
      questionSnapshotJson: JSON.stringify(snapshot),
      displayOrder: 1,
    },
  });
  expect(res.status()).toBe(201);
  const q = await res.json();
  return q.id;
}

export async function createQuizAttempt(request, token, quizId) {
  const startRes = await request.post(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
    headers: authHeaders(token),
  });
  expect(startRes.status()).toBe(200);
  const startData = await startRes.json();
  const attemptId = startData.attemptId;

  const submitRes = await request.post(`${API_BASE_URL}/attempts/${attemptId}/submit`, {
    headers: authHeaders(token),
  });
  expect(submitRes.status()).toBe(200);
  return attemptId;
}

export async function deleteQuiz(request, token, quizId) {
  await request.delete(`${API_BASE_URL}/quiz/${quizId}`, {
    headers: authHeaders(token),
  });
}

// ── Question creation (for user stats) ───────────────────────────────────────

export async function createQuestion(request, token, uniqueTag = null) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  const tag = uniqueTag || `dashboard-api-test-${id}`;
  const questionData = {
    type: 'multiple_choice',
    content: `Dashboard API test question ${id}`,
    explanation: 'Explanation',
    metadataJson: JSON.stringify({
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
      ],
      correctAnswers: ['a'],
    }),
    tagNames: [tag],
  };
  const res = await request.post(`${API_BASE_URL}/question`, {
    headers: authHeaders(token),
    data: questionData,
  });
  expect(res.status()).toBe(201);
  const q = await res.json();
  return { id: q.id, tag };
}

export async function deleteQuestion(request, token, questionId) {
  await request.delete(`${API_BASE_URL}/question/${questionId}`, {
    headers: authHeaders(token),
  });
}

// ── Source creation (for user stats) ─────────────────────────────────────────

export async function createSource(request, token, uniqueTag = null) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  const tag = uniqueTag || `dashboard-api-test-${id}`;
  const sourceData = {
    title: `Dashboard API source ${id}`,
    content: 'This is a test source for dashboard API stats.',
    // Sources don't have tags, so we can't tag them. We'll rely on title prefix.
  };
  const res = await request.post(`${API_BASE_URL}/source/note`, {
    headers: authHeaders(token),
    data: sourceData,
  });
  expect(res.status()).toBe(201);
  const s = await res.json();
  return { id: s.id, title: sourceData.title };
}

export async function deleteSource(request, token, sourceId) {
  await request.delete(`${API_BASE_URL}/source/${sourceId}`, {
    headers: authHeaders(token),
  });
}

// ── Favorite creation (for user stats) ───────────────────────────────────────

export async function createFavorite(request, token, text = 'test favorite') {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  const res = await request.post(`${API_BASE_URL}/favorites`, {
    headers: authHeaders(token),
    data: { text: `${text} ${id}`, type: 'word', note: '' },
  });
  expect(res.status()).toBe(201);
  const fav = await res.json();
  return fav.id;
}

export async function deleteFavorite(request, token, favoriteId) {
  await request.delete(`${API_BASE_URL}/favorites/${favoriteId}`, {
    headers: authHeaders(token),
  });
}