// e2e_tests/tests/question/backend/questions-api-pagination.spec.js
const { test, expect } = require('@playwright/test');
const { API_BASE_URL, adminUser, generateQuestion } = require('./questions-api-test-utils');

test.describe('Questions API - Pagination', () => {
  let adminToken;
  const createdQuestionIds = [];

  // Unique tag to isolate our test questions
  const testTag = `pagination-test-${Date.now()}`;
  const totalTestQuestions = 25; // enough to test multiple pages

  test.beforeAll(async ({ request }) => {
    // Login as admin
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    adminToken = loginBody.token;

    // Create a batch of questions with the unique tag
    const creationPromises = [];
    for (let i = 0; i < totalTestQuestions; i++) {
      const questionData = generateQuestion('multiple_choice');
      // Ensure each question has our test tag plus a unique name for content
      questionData.tagNames = questionData.tagNames || [];
      questionData.tagNames.push(testTag);
      // Make content slightly different to avoid collisions
      questionData.content = `[Pagination Test ${i}] ${questionData.content}`;
      creationPromises.push(
        request.post(`${API_BASE_URL}/question`, {
          headers: { 'X-Session-Token': adminToken },
          data: questionData,
        })
      );
    }
    const responses = await Promise.all(creationPromises);
    for (const res of responses) {
      expect(res.status()).toBe(201);
      const q = await res.json();
      createdQuestionIds.push(q.id);
    }
  });

  test.afterAll(async ({ request }) => {
    // Clean up all created questions
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

  // Helper that now accepts the `request` fixture as a parameter
  const fetchPaginated = async (request, page = 1, pageSize = 20, extraParams = {}) => {
    const params = new URLSearchParams({
      tags: testTag,
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...extraParams,
    });
    const url = `${API_BASE_URL}/question?${params.toString()}`;
    const res = await request.get(url, {
      headers: { 'X-Session-Token': adminToken },
    });
    return res;
  };

  test('should return paginated result with default page and pageSize', async ({ request }) => {
    const res = await fetchPaginated(request); // pass request here
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeLessThanOrEqual(20);
    expect(body).toHaveProperty('total');
    expect(body.total).toBe(totalTestQuestions);
    expect(body).toHaveProperty('page', 1);
    expect(body).toHaveProperty('pageSize', 20);
    expect(body).toHaveProperty('totalPages');
    expect(body.totalPages).toBe(Math.ceil(totalTestQuestions / 20));
  });

  test('should respect pageSize parameter and cap at 50', async ({ request }) => {
    // Request pageSize 10
    const res1 = await fetchPaginated(request, 1, 10);
    expect(res1.status()).toBe(200);
    const body1 = await res1.json();
    expect(body1.pageSize).toBe(10);
    expect(body1.items.length).toBe(10);

    // Request pageSize 60 (should be capped to 50)
    const res2 = await fetchPaginated(request, 1, 60);
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();
    expect(body2.pageSize).toBe(50); // field is capped
    expect(body2.items.length).toBe(totalTestQuestions); // only 25 exist
  });

  test('should return correct page of items', async ({ request }) => {
    const pageSize = 5;
    // Page 1
    const res1 = await fetchPaginated(request, 1, pageSize);
    const body1 = await res1.json();
    expect(body1.items.length).toBe(pageSize);
    expect(body1.page).toBe(1);

    // Page 2
    const res2 = await fetchPaginated(request, 2, pageSize);
    const body2 = await res2.json();
    expect(body2.items.length).toBe(pageSize);
    expect(body2.page).toBe(2);

    // Ensure items are distinct (no overlap)
    const idsPage1 = body1.items.map(i => i.id);
    const idsPage2 = body2.items.map(i => i.id);
    const intersection = idsPage1.filter(id => idsPage2.includes(id));
    expect(intersection.length).toBe(0);
  });

  test('should return total and totalPages correctly', async ({ request }) => {
    const pageSize = 7;
    const res = await fetchPaginated(request, 1, pageSize);
    const body = await res.json();
    expect(body.total).toBe(totalTestQuestions);
    expect(body.totalPages).toBe(Math.ceil(totalTestQuestions / pageSize));
  });

  test('should handle page beyond total (empty items)', async ({ request }) => {
    const lastPage = Math.ceil(totalTestQuestions / 10);
    const res = await fetchPaginated(request, lastPage + 1, 10);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(0);
    expect(body.total).toBe(totalTestQuestions);
    expect(body.page).toBe(lastPage + 1);
    expect(body.pageSize).toBe(10);
    expect(body.totalPages).toBe(lastPage);
  });

  test('should handle page=0 (default to 1)', async ({ request }) => {
    const res = await fetchPaginated(request, 0, 10);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // With backend normalization, page should become 1
    expect(body.page).toBe(1);
  });

  test('should handle negative page (default to 1)', async ({ request }) => {
    const res = await fetchPaginated(request, -5, 10);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
  });

  test('should combine pagination with search filter (type)', async ({ request }) => {
    // Count how many of our test questions are type multiple_choice (should be all 25)
    const res = await fetchPaginated(request, 1, 10, { type: 'multiple_choice' });
    const body = await res.json();
    expect(body.total).toBe(totalTestQuestions);
    // All returned items should have type multiple_choice
    body.items.forEach(q => expect(q.type).toBe('multiple_choice'));
  });

  test('should reject unauthorized access', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/question?page=1&pageSize=20`);
    expect(res.status()).toBe(401); // Now that controller requires authentication
  });

  test('should handle mine filter (if implemented as search with userId)', async ({ request }) => {
    // The endpoint with ?mine=true should now use pagination
    const res = await request.get(`${API_BASE_URL}/question?mine=true&page=1&pageSize=5`, {
      headers: { 'X-Session-Token': adminToken },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body.page).toBe(1);
    expect(body.items.length).toBeLessThanOrEqual(5);

    // All returned items should belong to the admin user
    body.items.forEach(q => {
      expect(q.userName).toBe(adminUser.username);
    });
  });
});