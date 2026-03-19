// questions-api-multiple-runs.spec.js
const { test, expect } = require('@playwright/test');
const { API_BASE_URL, adminUser, generateQuestion } = require('./questions-api-test-utils');

test.describe('Questions API - Multiple Runs', () => {
  let adminToken;

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });
    const loginBody = await loginRes.json();
    adminToken = loginBody.token;
  });

  for (let i = 0; i < 3; i++) {
    test(`parallel question creation ${i + 1}`, async ({ request }) => {
      const questionData = generateQuestion('multiple_choice');

      const createRes = await request.post(`${API_BASE_URL}/question`, {
        headers: { 'X-Session-Token': adminToken },
        data: questionData,
      });

      expect(createRes.status()).toBe(201);
      const question = await createRes.json();

      const getRes = await request.get(`${API_BASE_URL}/question/${question.id}`, {
        headers: { 'X-Session-Token': adminToken },
      });
      expect(getRes.status()).toBe(200);

      await request.delete(`${API_BASE_URL}/question/${question.id}`, {
        headers: { 'X-Session-Token': adminToken },
      });
    });
  }

  test('should handle concurrent tag creation', async ({ request }) => {
    const commonTag = `concurrent-${Date.now()}`;
    const promises = [];

    for (let i = 0; i < 5; i++) {
      const questionData = {
        type: 'multiple_choice',
        content: `Concurrent question ${i} ${Date.now()}`,
        metadataJson: JSON.stringify({
          options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
          correctAnswers: ['a']
        }),
        tagNames: [commonTag, 'concurrent-test']
      };

      promises.push(
        request.post(`${API_BASE_URL}/question`, {
          headers: { 'X-Session-Token': adminToken },
          data: questionData,
        }).then(async res => {
          expect(res.status()).toBe(201);
          const q = await res.json();
          return q.id;
        })
      );
    }

    const questionIds = await Promise.all(promises);

    for (const id of questionIds) {
      const getRes = await request.get(`${API_BASE_URL}/question/${id}`, {
        headers: { 'X-Session-Token': adminToken },
      });
      expect(getRes.status()).toBe(200);

      await request.delete(`${API_BASE_URL}/question/${id}`, {
        headers: { 'X-Session-Token': adminToken },
      });
    }

    const searchRes = await request.get(`${API_BASE_URL}/question?tags=${commonTag}`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(searchRes.status()).toBe(200);
    const results = await searchRes.json();
    expect(results.length).toBe(0);
  });
});