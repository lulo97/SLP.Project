// questions-api-multiple-choice.spec.js
const { test, expect } = require('@playwright/test');
const { API_BASE_URL, adminUser, generateInvalidQuestion } = require('./questions-api-test-utils');

test.describe('Questions API - Multiple Choice Validation', () => {
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

  const validType = 'multiple_choice';

  test('should reject missing options', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'missing options');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('options');
  });

  test('should reject options not an array', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'options not array');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('options');
  });

  test('should reject less than 2 options', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'less than 2 options');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('at least 2 options');
  });

  test('should reject option missing id', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'option missing id');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('id');
  });

  test('should reject option missing text', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'option missing text');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('text');
  });

  test('should reject option empty text', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'option empty text');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('empty');
  });

  test('should reject duplicate option ids', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'duplicate option id');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Duplicate option id');
  });

  test('should reject missing correctAnswers', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'missing correctAnswers');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('correctAnswers');
  });

  test('should reject empty correctAnswers', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'correctAnswers empty');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('at least one correct answer');
  });

  test('should reject correctAnswer id not in options', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'correctAnswer id not in options');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('does not match any option');
  });
});