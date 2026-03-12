// questions-api-matching.spec.js
const { test, expect } = require('@playwright/test');
const { API_BASE_URL, adminUser, generateInvalidQuestion } = require('./questions-api-test-utils');

test.describe('Questions API - Matching Validation', () => {
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

  const validType = 'matching';

  test('should reject missing pairs', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'missing pairs');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('pairs');
  });

  test('should reject pairs not array', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'pairs not array');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('pairs');
  });

  test('should reject less than 2 pairs', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'less than 2 pairs');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('at least 2 pairs');
  });

  test('should reject pair missing id', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'pair missing id');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('id');
  });

  test('should reject pair id not integer', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'pair id not integer');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('integer');
  });

  test('should reject duplicate pair ids', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'duplicate pair id');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Duplicate pair id');
  });

  test('should reject pair missing left', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'pair missing left');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('left');
  });

  test('should reject pair missing right', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'pair missing right');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('right');
  });

  test('should reject pair left empty', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'pair left empty');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('empty');
  });

  test('should reject pair right empty', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'pair right empty');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('empty');
  });
});