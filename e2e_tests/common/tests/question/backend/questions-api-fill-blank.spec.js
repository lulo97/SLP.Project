// questions-api-fill-blank.spec.js
const { test, expect } = require('@playwright/test');
const { API_BASE_URL, adminUser, generateInvalidQuestion } = require('./questions-api-test-utils');

test.describe('Questions API - Fill in the Blank Validation', () => {
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

  const validType = 'fill_blank';

  test('should reject missing keywords', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'missing keywords');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('keywords');
  });

  test('should reject keywords not array', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'keywords not array');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('keywords');
  });

  test('should reject empty keywords array', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'keywords empty array');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('exactly one keyword');
  });

  test('should reject more than one keyword', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'more than one keyword');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('exactly one keyword');
  });

  test('should reject empty keyword string', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'keyword empty string');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('empty');
  });

  test('should reject keyword with spaces', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'keyword contains spaces');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('single word');
  });

  test('should reject keyword not in content', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'keyword not in content');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('must appear');
  });
});