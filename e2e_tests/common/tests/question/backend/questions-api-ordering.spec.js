// questions-api-ordering.spec.js
const { test, expect } = require('@playwright/test');
const { API_BASE_URL, adminUser, generateInvalidQuestion } = require('./questions-api-test-utils');

test.describe('Questions API - Ordering Validation', () => {
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

  const validType = 'ordering';

  test('should reject missing items', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'missing items');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('items');
  });

  test('should reject items not array', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'items not array');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('items');
  });

  test('should reject less than 3 items', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'less than 3 items');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('at least 3 items');
  });

  test('should reject item missing order_id', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'item missing order_id');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('order_id');
  });

  test('should reject order_id not integer', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'order_id not integer');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('integer');
  });

  test('should reject order_id out of range (too high)', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'order_id out of range (too high)');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('between 1 and');
  });

  test('should reject order_id out of range (too low)', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'order_id out of range (too low)');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('between 1 and');
  });

  test('should reject duplicate order_id', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'duplicate order_id');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Duplicate order_id');
  });

  test('should reject non-consecutive order_id', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'non-consecutive order_id');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Order_id must be between');
  });

  test('should reject item missing text', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'item missing text');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('text');
  });

  test('should reject item empty text', async ({ request }) => {
    const invalidData = generateInvalidQuestion(validType, 'item empty text');
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('empty');
  });
});