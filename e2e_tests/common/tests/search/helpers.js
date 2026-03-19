// @ts-check
import { expect } from "@playwright/test";

export const API_BASE_URL = "http://localhost:5140/api";

export const ADMIN_USER = { username: "admin", password: "123" };

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(request) {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: ADMIN_USER,
  });
  expect(res.status(), "login failed").toBe(200);
  const body = await res.json();
  return body.token;
}

// ── Unique string generator ───────────────────────────────────────────────────

export function unique(prefix = "item") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
}

// ── Search wrapper ────────────────────────────────────────────────────────────

export async function searchApi(request, token, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const res = await request.get(`${API_BASE_URL}/search?${qs.toString()}`, {
    headers: { "X-Session-Token": token },
  });
  const body = res.status() === 200 ? await res.json() : null;
  return { res, body };
}

// ── Quiz helpers ──────────────────────────────────────────────────────────────
// Route: api/quiz  (QuizController uses [Route("api/[controller]")])

export async function createQuiz(request, token, overrides = {}) {
  const title = overrides.title ?? unique("Quiz");
  const res = await request.post(`${API_BASE_URL}/quiz`, {
    headers: { "X-Session-Token": token },
    data: {
      title,
      description: overrides.description ?? `Description for ${title}`,
      visibility: overrides.visibility ?? "public",
      tagNames: overrides.tagNames ?? [],
    },
  });
  expect(res.status(), `createQuiz failed (${res.status()})`).toBe(201);
  return res.json();
}

export async function deleteQuiz(request, token, id) {
  await request.delete(`${API_BASE_URL}/quiz/${id}`, {
    headers: { "X-Session-Token": token },
  });
}

// ── Question helpers ──────────────────────────────────────────────────────────
// Route: api/question  (QuestionController uses [Route("api/[controller]")])
// MetadataJson is a *serialized JSON string* on CreateQuestionDto.

export async function createQuestion(request, token, overrides = {}) {
  const type = overrides.type ?? "true_false";
  const content = overrides.content ?? unique("Question content");

  // Default valid metadata per type
  const defaultMeta = {
    true_false: { correctAnswer: true },
    flashcard: { front: "front text", back: "back text" },
  };
  const metaObj = overrides.metadata ?? defaultMeta[type] ?? { correctAnswer: true };

  const res = await request.post(`${API_BASE_URL}/question`, {
    headers: { "X-Session-Token": token },
    data: {
      type,
      content,
      explanation: overrides.explanation ?? null,
      tagNames: overrides.tagNames ?? [],
      // metadataJson is a serialized JSON string field in CreateQuestionDto
      metadataJson: JSON.stringify(metaObj),
    },
  });
  expect(res.status(), `createQuestion failed (${res.status()})`).toBe(201);
  return res.json();
}

export async function deleteQuestion(request, token, id) {
  await request.delete(`${API_BASE_URL}/question/${id}`, {
    headers: { "X-Session-Token": token },
  });
}

// ── Source helpers ────────────────────────────────────────────────────────────
// Route: api/source  (SourceController uses [Route("api/[controller]")])
// Note sources: POST /api/source/note  { title, content }

export async function createSource(request, token, overrides = {}) {
  const title = overrides.title ?? unique("Source");
  const res = await request.post(`${API_BASE_URL}/source/note`, {
    headers: { "X-Session-Token": token },
    data: {
      title,
      content: overrides.content ?? `Raw text content for ${title}`,
    },
  });
  expect(res.status(), `createSource failed (${res.status()})`).toBe(201);
  return res.json();
}

export async function deleteSource(request, token, id) {
  await request.delete(`${API_BASE_URL}/source/${id}`, {
    headers: { "X-Session-Token": token },
  });
}

// ── Favorite helpers ──────────────────────────────────────────────────────────
// Route: api/favorites  (explicit [Route("api/favorites")])

export async function createFavorite(request, token, overrides = {}) {
  const text = overrides.text ?? unique("favorite word");
  const res = await request.post(`${API_BASE_URL}/favorites`, {
    headers: { "X-Session-Token": token },
    data: {
      text,
      type: overrides.type ?? "word",
      note: overrides.note ?? null,
    },
  });
  expect(res.status(), `createFavorite failed (${res.status()})`).toBe(201);
  return res.json();
}

export async function deleteFavorite(request, token, id) {
  await request.delete(`${API_BASE_URL}/favorites/${id}`, {
    headers: { "X-Session-Token": token },
  });
}
