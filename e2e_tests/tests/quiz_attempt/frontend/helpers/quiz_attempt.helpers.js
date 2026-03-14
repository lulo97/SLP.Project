// helpers/quiz_attempt.helpers.js
// Shared utilities used across all quiz-attempt spec files.

export const API_BASE_URL = "http://localhost:5140/api";
export const APP_BASE_URL = "http://localhost:4000";

export const ADMIN_USER = { username: "admin", password: "123" };

// ─── ID / data generators ───────────────────────────────────────────────────

export function generateUniqueId() {
  return `${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
}

export function generateQuizPayload(label = "Attempt") {
  return {
    title: `[PW] Quiz ${label} ${generateUniqueId()}`,
    description: "Playwright quiz-attempt test",
    visibility: "private",
    tagNames: ["playwright", "attempt-test"],
  };
}

// ─── Question type lists ─────────────────────────────────────────────────────
//
// After the backend fix, ALL 7 types are accepted by the question-creation API.
// Flashcard is accepted but NOT scored (isCorrect = null, doesn't count toward maxScore).
//
// BACKEND_QUESTION_TYPES: every type the backend creation API accepts (all 7).
// SCORED_TYPES:           types that contribute to the score (all except flashcard).
// ALL_QUESTION_TYPES:     alias for BACKEND_QUESTION_TYPES — one source of truth.

export const BACKEND_QUESTION_TYPES = [
  "multiple_choice",
  "single_choice",
  "true_false",
  "fill_blank",
  "ordering",
  "matching",
  "flashcard",
];

export const ALL_QUESTION_TYPES = BACKEND_QUESTION_TYPES;

// Flashcard is informational — never contributes to score.
export const SCORED_TYPES = BACKEND_QUESTION_TYPES.filter(t => t !== "flashcard");

// ─── Question snapshot factories ─────────────────────────────────────────────
//
// Canonical rules enforced by the backend validator (QuestionValidationHelper.cs):
//   • option id fields MUST be non-empty strings
//   • multiple_choice / single_choice: correct ids live in "correctAnswers" (not "correct")
//   • single_choice: correctAnswers must have exactly 1 element
//   • true_false: correct value lives in "correctAnswer" (boolean, not "correct")
//   • fill_blank: "keywords" = display blanking words, "answers" = grading values
//   • ordering: NO correctOrder field — correct order is items sorted by order_id asc
//   • matching: pairs have integer "id" fields

export function makeSnapshot(type, order = 1) {
  const base = {
    type,
    content: `${type} question ${order}`,
    explanation: `Explanation for ${type} question ${order}`,
    tags: ["playwright"],
  };

  switch (type) {
    case "multiple_choice":
      return {
        ...base,
        metadata: {
          options: [
            { id: "0", text: "Option A" },
            { id: "1", text: "Option B" },
            { id: "2", text: "Option C" },
          ],
          correctAnswers: ["0", "2"], // canonical field name — NOT "correct"
        },
      };

    case "single_choice":
      return {
        ...base,
        metadata: {
          options: [
            { id: "0", text: "Option A" },
            { id: "1", text: "Option B" },
          ],
          correctAnswers: ["0"], // exactly 1 element required by validator
        },
      };

    case "true_false":
      return {
        ...base,
        metadata: {
          correctAnswer: true, // canonical field name — NOT "correct"
        },
      };

    case "fill_blank":
      return {
        ...base,
        content: `${type} question with keyword ${order}`,
        metadata: {
          keywords: ["keyword"],                             // display: words to replace with ___
          answers: ["correct answer", "alternative"],       // grading: accepted values
        },
      };

    case "ordering":
      return {
        ...base,
        metadata: {
          items: [
            { order_id: 1, text: "Item A" },
            { order_id: 2, text: "Item B" },
            { order_id: 3, text: "Item C" },
          ],
          // No "correct_order" field — correct order is always items sorted by order_id asc
        },
      };

    case "matching":
      return {
        ...base,
        metadata: {
          pairs: [
            { id: 1, left: "Left 1", right: "Right 1" },
            { id: 2, left: "Left 2", right: "Right 2" },
          ],
        },
      };

    case "flashcard":
      return {
        ...base,
        metadata: {
          front: "Front of flashcard",
          back: "Back of flashcard",
        },
      };

    default:
      throw new Error(
        `Unknown question type: "${type}". ` +
        `Supported: ${BACKEND_QUESTION_TYPES.join(", ")}`,
      );
  }
}

// ─── Answer factories ────────────────────────────────────────────────────────
//
// All option ids are strings (matching the string ids in makeSnapshot).
// single_choice: "selected" is a plain string (not an array).
// flashcard: empty object — unscored, no answer required.

export function makeCorrectAnswer(type) {
  switch (type) {
    case "multiple_choice": return { selected: ["0", "2"] };  // string id array
    case "single_choice":   return { selected: "0" };          // single string id
    case "true_false":      return { selected: true };
    case "fill_blank":      return { answer: "correct answer" };
    case "ordering":        return { order: [1, 2, 3] };       // order_ids in correct asc order
    case "matching":        return { matches: [{ leftId: 1, rightId: 1 }, { leftId: 2, rightId: 2 }] };
    case "flashcard":       return {};                          // unscored — any payload accepted
    default: throw new Error(`No correct-answer factory for type: ${type}`);
  }
}

export function makeWrongAnswer(type) {
  switch (type) {
    case "multiple_choice": return { selected: ["1"] };        // only one, wrong set
    case "single_choice":   return { selected: "1" };          // wrong string id
    case "true_false":      return { selected: false };        // opposite of correctAnswer: true
    case "fill_blank":      return { answer: "wrong answer" };
    case "ordering":        return { order: [3, 2, 1] };       // reversed
    case "matching":        return { matches: [{ leftId: 1, rightId: 2 }, { leftId: 2, rightId: 1 }] };
    case "flashcard":       return {};                          // unscored — wrong/right meaningless
    default: throw new Error(`No wrong-answer factory for type: ${type}`);
  }
}

// ─── Auth storage key ────────────────────────────────────────────────────────
//
// The key your frontend uses to store the session token in localStorage.
// Find it by opening DevTools → Application → Local Storage after logging in,
// or by searching your frontend code for `localStorage.setItem`.
// Common values: "token", "auth_token", "session_token", "slp_token".
//
// ⚠️  UPDATE THIS if your app uses a different key.
export const AUTH_STORAGE_KEY = "session_token";

// ─── UI login helper ─────────────────────────────────────────────────────────
//
// Bypasses the login form entirely: gets a token via the API (already working)
// and injects it into localStorage before navigating to the target URL.
// This avoids any dependency on login-form data-testid attributes.
//
// Usage:
//   await uiLogin(page, request);               // goes to APP_BASE_URL after login
//   await uiLogin(page, request, "/quiz/123");  // goes to specific path after login
//
export async function uiLogin(page, request, redirectPath = "/") {
  const token = await loginAsAdmin(request);

  // Inject token into localStorage before any navigation so the app
  // treats the session as already authenticated on first load.
  await page.addInitScript(
    ({ key, value }) => { localStorage.setItem(key, value); },
    { key: AUTH_STORAGE_KEY, value: token },
  );

  await page.goto(`${APP_BASE_URL}${redirectPath}`);

  // Wait until the app has moved past any auth guard.
  // The app should redirect away from /login if the token is valid.
  // Adjust the timeout if your app's initial auth check is slow.
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    { timeout: 10_000 },
  );
}

export async function loginAsAdmin(request) {
  const res = await request.post(`${API_BASE_URL}/auth/login`, { data: ADMIN_USER });
  const body = await res.json();
  return body.token;
}

export function authHeaders(token) {
  return { "X-Session-Token": token };
}

/**
 * Creates a quiz + N questions and returns { quizId, questionIds }.
 * types defaults to ALL_QUESTION_TYPES.
 */
export async function createQuizWithQuestions(request, token, types = ALL_QUESTION_TYPES, label = "Attempt") {
  const quizData = generateQuizPayload(label);
  const createQuizRes = await request.post(`${API_BASE_URL}/quiz`, {
    headers: authHeaders(token),
    data: quizData,
  });
  if (createQuizRes.status() !== 201) {
    throw new Error(`createQuiz failed: ${createQuizRes.status()} ${await createQuizRes.text()}`);
  }
  const quiz = await createQuizRes.json();

  const questionIds = [];
  for (let i = 0; i < types.length; i++) {
    const snapshot = makeSnapshot(types[i], i + 1);
    const res = await request.post(`${API_BASE_URL}/quiz/${quiz.id}/questions`, {
      headers: authHeaders(token),
      data: {
        questionSnapshotJson: JSON.stringify(snapshot),
        displayOrder: i + 1,
      },
    });
    if (res.status() !== 201) {
      throw new Error(`createQuestion[${types[i]}] failed: ${res.status()} ${await res.text()}`);
    }
    const q = await res.json();
    questionIds.push(q.id);
  }

  return { quizId: quiz.id, questionIds, quizTitle: quizData.title };
}

/** Start an attempt and return { attemptId, questions }. */
export async function startAttempt(request, token, quizId) {
  const res = await request.post(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
    headers: authHeaders(token),
  });
  if (res.status() !== 200) {
    throw new Error(`startAttempt failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

/** Submit one answer. Returns the response object. */
export async function submitAnswer(request, token, attemptId, quizQuestionId, answerPayload) {
  return request.post(`${API_BASE_URL}/attempts/${attemptId}/answers`, {
    headers: authHeaders(token),
    data: { quizQuestionId, answerJson: JSON.stringify(answerPayload) },
  });
}

/** Submit all correct answers for a given list of (questionId, type) pairs. */
export async function submitAllCorrectAnswers(request, token, attemptId, questionIds, types) {
  for (let i = 0; i < types.length; i++) {
    const res = await submitAnswer(request, token, attemptId, questionIds[i], makeCorrectAnswer(types[i]));
    if (res.status() !== 200) {
      throw new Error(`submitAnswer[${types[i]}] failed: ${res.status()} ${await res.text()}`);
    }
  }
}

/** Submit the attempt and return response json. */
export async function finalizeAttempt(request, token, attemptId) {
  const res = await request.post(`${API_BASE_URL}/attempts/${attemptId}/submit`, {
    headers: authHeaders(token),
  });
  return { status: res.status(), body: await res.json() };
}

/** Hard-delete a quiz (cascades attempts/answers). */
export async function deleteQuiz(request, token, quizId) {
  const res = await request.delete(`${API_BASE_URL}/quiz/${quizId}`, {
    headers: authHeaders(token),
  });
  if (res.status() !== 204) {
    console.warn(`deleteQuiz(${quizId}) returned ${res.status()}`);
  }
}

/**
 * Full setup: login → create quiz+questions → start attempt.
 * Returns everything callers need.
 */
export async function fullSetup(request, types = ALL_QUESTION_TYPES, label = "Attempt") {
  const token = await loginAsAdmin(request);
  const { quizId, questionIds, quizTitle } = await createQuizWithQuestions(request, token, types, label);
  const startData = await startAttempt(request, token, quizId);
  return { token, quizId, questionIds, quizTitle, startData, attemptId: startData.attemptId };
}

/**
 * Full teardown: delete quiz (cascades everything).
 */
export async function fullTeardown(request, token, quizId) {
  await deleteQuiz(request, token, quizId);
}