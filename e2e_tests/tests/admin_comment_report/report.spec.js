import { test, expect } from '@playwright/test';
import {
  API_BASE_URL,
  generateUser,
  registerUser,
  login,
  loginAsAdmin,
  createQuiz,
  createComment,
  createReport,
  deleteUser,
} from './helpers.js';

test.describe('Reports', () => {
  let testUserData;
  let createdUser;
  let userToken;
  let adminToken;
  let quiz;
  let comment;

  test.beforeEach(async ({ request }) => {
    testUserData = generateUser();
    createdUser = await registerUser(request, testUserData);
    userToken = await login(request, testUserData.username, testUserData.password);
    quiz = await createQuiz(request, userToken, 'Report Test Quiz');
    comment = await createComment(request, userToken, 'quiz', quiz.id, 'This comment will be reported');
  });

  test.afterEach(async ({ request }) => {
    adminToken = await loginAsAdmin(request);
    await deleteUser(request, adminToken, createdUser.id);
  });

  test('create report, admin views and resolves', async ({ request }) => {
    // Create report on comment
    const report = await createReport(request, userToken, 'comment', comment.id, 'Inappropriate content');
    expect(report.targetType).toBe('comment');
    expect(report.targetId).toBe(comment.id);
    expect(report.resolved).toBe(false);

    // Admin gets unresolved reports
    adminToken = await loginAsAdmin(request);
    const getReportsRes = await request.get(`${API_BASE_URL}/reports`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(getReportsRes.status()).toBe(200);
    const reports = await getReportsRes.json();
    expect(reports.length).toBeGreaterThanOrEqual(1);
    const found = reports.find(r => r.id === report.id);
    expect(found).toBeTruthy();

    // Admin resolves report
    const resolveRes = await request.post(`${API_BASE_URL}/reports/${report.id}/resolve`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(resolveRes.status()).toBe(200);

    // Check resolved report no longer appears in unresolved
    const getAfterResolve = await request.get(`${API_BASE_URL}/reports`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(getAfterResolve.status()).toBe(200);
    const after = await getAfterResolve.json();
    const stillThere = after.some(r => r.id === report.id);
    expect(stillThere).toBe(false);
  });

  test('admin logs include report resolution', async ({ request }) => {
    // Create report
    const report = await createReport(request, userToken, 'comment', comment.id, 'Spam');

    // Admin resolves
    adminToken = await loginAsAdmin(request);
    await request.post(`${API_BASE_URL}/reports/${report.id}/resolve`, {
      headers: { 'X-Session-Token': adminToken },
    });

    // Check admin logs
    const logsRes = await request.get(`${API_BASE_URL}/admin/logs?count=50`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(logsRes.status()).toBe(200);
    const logs = await logsRes.json();
    const resolveLog = logs.find(l => l.action === 'resolve_report' && l.targetId === report.id);
    expect(resolveLog).toBeTruthy();
    expect(resolveLog.targetType).toBe('report');
  });
});