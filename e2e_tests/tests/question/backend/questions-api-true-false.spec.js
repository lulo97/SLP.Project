// questions-api-true-false.spec.js
const { test, expect } = require('@playwright/test');
const { API_BASE_URL, adminUser, generateInvalidQuestion } = require('./questions-api-test-utils');

test.describe('Questions API - True/False Validation', () => {
  let adminToken;
  const createdQuestionIds = [];

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });

    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    adminToken = loginBody.token;
  });

  test.afterAll(async ({ request }) => {
    for (const id of createdQuestionIds) {
      try {
        await request.delete(`${API_BASE_URL}/question/${id}`, {
          headers: { 'X-Session-Token': adminToken },
        });
      } catch (error) {
        console.log(`Failed to delete question ${id}: ${error}`);
      }
    }
  });

  const validType = 'true_false';

  test('should reject missing correctAnswer', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'missing correctAnswer');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('correctAnswer');
  });

  test('should reject correctAnswer not boolean', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'correctAnswer not boolean');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('boolean');
  });
});