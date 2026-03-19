import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  generateUser,
  registerUser,
  login,
  loginAsAdmin,
  createQuiz,
  deleteUser,
} from "./helpers.js";

test.describe("Admin actions", () => {
  let testUserData;
  let createdUser;
  let userToken;
  let adminToken;
  let quiz;

  test.beforeEach(async ({ request }) => {
    testUserData = generateUser();
    createdUser = await registerUser(request, testUserData);
    userToken = await login(
      request,
      testUserData.username,
      testUserData.password,
    );
    quiz = await createQuiz(request, userToken, "Admin Test Quiz");
  });

  test.afterEach(async ({ request }) => {
    adminToken = await loginAsAdmin(request);
    await deleteUser(request, adminToken, createdUser.id);
  });

  test("admin can ban and unban user", async ({ request }) => {
    adminToken = await loginAsAdmin(request);

    // Ban user
    const banRes = await request.post(
      `${API_BASE_URL}/admin/users/${createdUser.id}/ban`,
      {
        headers: { "X-Session-Token": adminToken },
      },
    );
    expect(banRes.status()).toBe(200);

    // Verify user cannot login
    const loginAttempt = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: testUserData.username,
        password: testUserData.password,
      },
    });
    expect(loginAttempt.status()).toBe(401);

    // Unban user
    const unbanRes = await request.post(
      `${API_BASE_URL}/admin/users/${createdUser.id}/unban`,
      {
        headers: { "X-Session-Token": adminToken },
      },
    );
    expect(unbanRes.status()).toBe(200);

    // Verify user can login again
    const loginAfter = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: testUserData.username,
        password: testUserData.password,
      },
    });
    expect(loginAfter.status()).toBe(200);
  });

  test("admin can disable and enable quiz", async ({ request }) => {
    adminToken = await loginAsAdmin(request);

    // Disable quiz
    const disableRes = await request.post(
      `${API_BASE_URL}/admin/quizzes/${quiz.id}/disable`,
      {
        headers: { "X-Session-Token": adminToken },
      },
    );
    expect(disableRes.status()).toBe(200);

    // Verify quiz is disabled in admin view
    const quizzesRes = await request.get(`${API_BASE_URL}/admin/quizzes`, {
      headers: { "X-Session-Token": adminToken },
    });
    expect(quizzesRes.status()).toBe(200);
    const quizzes = await quizzesRes.json();
    const found = quizzes.find((q) => q.id === quiz.id);
    expect(found.disabled).toBe(true);

    // Enable quiz
    const enableRes = await request.post(
      `${API_BASE_URL}/admin/quizzes/${quiz.id}/enable`,
      {
        headers: { "X-Session-Token": adminToken },
      },
    );
    expect(enableRes.status()).toBe(200);

    // Verify enabled
    const quizzesAfter = await request.get(`${API_BASE_URL}/admin/quizzes`, {
      headers: { "X-Session-Token": adminToken },
    });
    const after = await quizzesAfter.json();
    const foundAfter = after.find((q) => q.id === quiz.id);
    expect(foundAfter.disabled).toBe(false);
  });

  test("admin logs are recorded", async ({ request }) => {
    adminToken = await loginAsAdmin(request);

    // Perform some actions
    await request.post(`${API_BASE_URL}/admin/users/${createdUser.id}/ban`, {
      headers: { "X-Session-Token": adminToken },
    });
    await request.post(`${API_BASE_URL}/admin/users/${createdUser.id}/unban`, {
      headers: { "X-Session-Token": adminToken },
    });
    await request.post(`${API_BASE_URL}/admin/quizzes/${quiz.id}/disable`, {
      headers: { "X-Session-Token": adminToken },
    });
    await request.post(`${API_BASE_URL}/admin/quizzes/${quiz.id}/enable`, {
      headers: { "X-Session-Token": adminToken },
    });

    // Fetch logs
    const logsRes = await request.get(`${API_BASE_URL}/admin/logs?count=50`, {
      headers: { "X-Session-Token": adminToken },
    });
    expect(logsRes.status()).toBe(200);
    const logs = await logsRes.json();

    // Filter logs to only those related to this user or quiz
    const relevantLogs = logs.filter(
      (log) =>
        (log.targetType === "user" && log.targetId === createdUser.id) ||
        (log.targetType === "quiz" && log.targetId === quiz.id),
    );

    const actions = relevantLogs.map((l) => l.action);
    expect(actions).toContain("ban_user");
    expect(actions).toContain("unban_user");
    expect(actions).toContain("disable_quiz");
    expect(actions).toContain("enable_quiz");
  });
});
