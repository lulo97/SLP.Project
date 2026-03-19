// e2e_tests/tests/quiz/backend/quiz-api-pagination.spec.js
const { test, expect } = require('@playwright/test');

const API_BASE_URL = 'http://localhost:5140/api';

const adminUser = {
  username: 'admin',
  password: '123',
};

// Helper to generate a quiz with a unique tag
function generateQuiz(tag) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    title: `Pagination Quiz ${id} ${tag}`, // tag in title for search
    description: 'Quiz for pagination testing',
    visibility: 'public',
    tagNames: [tag, 'pagination-test'],
  };
}

test.describe('Quiz API - Pagination', () => {
  let adminToken;
  const createdQuizIds = [];

  // Unique tag for this test run
  const testTag = `quiz-pagination-${Date.now()}`;
  const totalTestQuizzes = 25;

  test.beforeAll(async ({ request }) => {
    // Login as admin
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: adminUser,
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    adminToken = loginBody.token;

    // Create batch of quizzes with the unique tag
    const creationPromises = [];
    for (let i = 0; i < totalTestQuizzes; i++) {
      const quizData = generateQuiz(testTag);
      quizData.title = `[${i}] ${quizData.title}`; // slight variation
      creationPromises.push(
        request.post(`${API_BASE_URL}/quiz`, {
          headers: { 'X-Session-Token': adminToken },
          data: quizData,
        })
      );
    }
    const responses = await Promise.all(creationPromises);
    for (const res of responses) {
      expect(res.status()).toBe(201);
      const q = await res.json();
      createdQuizIds.push(q.id);
    }
  });

  test.afterAll(async ({ request }) => {
    // Clean up all created quizzes
    for (const id of createdQuizIds) {
      try {
        await request.delete(`${API_BASE_URL}/quiz/${id}`, {
          headers: { 'X-Session-Token': adminToken },
        });
      } catch (error) {
        console.log(`Failed to delete quiz ${id}: ${error}`);
      }
    }
  });

  // Helper to fetch paginated quizzes filtered by our test tag
  const fetchPaginated = async (request, params = {}) => {
    const query = new URLSearchParams({
      search: testTag,
      ...params,
    });
    const url = `${API_BASE_URL}/quiz?${query.toString()}`;
    const res = await request.get(url, {
      headers: { 'X-Session-Token': adminToken },
    });
    return res;
  };

  test('should return paginated result with default page and pageSize', async ({ request }) => {
    const res = await fetchPaginated(request);
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeLessThanOrEqual(20);
    expect(body).toHaveProperty('total');
    expect(body.total).toBe(totalTestQuizzes);
    expect(body).toHaveProperty('page', 1);
    expect(body).toHaveProperty('pageSize', 20);
    expect(body).toHaveProperty('totalPages');
    expect(body.totalPages).toBe(Math.ceil(totalTestQuizzes / 20));
  });

  test('should respect pageSize parameter and cap at 50', async ({ request }) => {
    const res1 = await fetchPaginated(request, { pageSize: 10 });
    expect(res1.status()).toBe(200);
    const body1 = await res1.json();
    expect(body1.pageSize).toBe(10);
    expect(body1.items.length).toBe(10);

    const res2 = await fetchPaginated(request, { pageSize: 60 });
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();
    expect(body2.pageSize).toBe(50);
    expect(body2.items.length).toBe(totalTestQuizzes);
  });

  test('should return correct page of items', async ({ request }) => {
    const pageSize = 5;
    const res1 = await fetchPaginated(request, { page: 1, pageSize });
    const body1 = await res1.json();
    expect(body1.items.length).toBe(pageSize);
    expect(body1.page).toBe(1);

    const res2 = await fetchPaginated(request, { page: 2, pageSize });
    const body2 = await res2.json();
    expect(body2.items.length).toBe(pageSize);
    expect(body2.page).toBe(2);

    const idsPage1 = body1.items.map(i => i.id);
    const idsPage2 = body2.items.map(i => i.id);
    const intersection = idsPage1.filter(id => idsPage2.includes(id));
    expect(intersection.length).toBe(0);
  });

  test('should return total and totalPages correctly', async ({ request }) => {
    const pageSize = 7;
    const res = await fetchPaginated(request, { page: 1, pageSize });
    const body = await res.json();
    expect(body.total).toBe(totalTestQuizzes);
    expect(body.totalPages).toBe(Math.ceil(totalTestQuizzes / pageSize));
  });

  test('should handle page beyond total (empty items)', async ({ request }) => {
    const lastPage = Math.ceil(totalTestQuizzes / 10);
    const res = await fetchPaginated(request, { page: lastPage + 1, pageSize: 10 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(0);
    expect(body.total).toBe(totalTestQuizzes);
    expect(body.page).toBe(lastPage + 1);
    expect(body.pageSize).toBe(10);
    expect(body.totalPages).toBe(lastPage);
  });

  test('should handle page=0 (default to 1)', async ({ request }) => {
    const res = await fetchPaginated(request, { page: 0, pageSize: 10 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
  });

  test('should handle negative page (default to 1)', async ({ request }) => {
    const res = await fetchPaginated(request, { page: -5, pageSize: 10 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
  });

  test('should combine pagination with search filter (visibility)', async ({ request }) => {
    const res = await fetchPaginated(request, { page: 1, pageSize: 10, visibility: 'public' });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(totalTestQuizzes);
    body.items.forEach(q => expect(q.visibility).toBe('public'));
  });

  test('should combine pagination with search filter (mine)', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/quiz?mine=true&search=${testTag}&page=1&pageSize=10`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(totalTestQuizzes);
    const ourIds = createdQuizIds;
    const found = body.items.some(item => ourIds.includes(item.id));
    expect(found).toBe(true);
  });

  test('should support sorting by title', async ({ request }) => {
    const resAsc = await fetchPaginated(request, { page: 1, pageSize: 10, sortBy: 'title', sortOrder: 'asc' });
    expect(resAsc.status()).toBe(200);
    const bodyAsc = await resAsc.json();
    const titlesAsc = bodyAsc.items.map(i => i.title);
    const sortedAsc = [...titlesAsc].sort((a, b) => a.localeCompare(b));
    expect(titlesAsc).toEqual(sortedAsc);

    const resDesc = await fetchPaginated(request, { page: 1, pageSize: 10, sortBy: 'title', sortOrder: 'desc' });
    expect(resDesc.status()).toBe(200);
    const bodyDesc = await resDesc.json();
    const titlesDesc = bodyDesc.items.map(i => i.title);
    const sortedDesc = [...titlesDesc].sort((a, b) => b.localeCompare(a));
    expect(titlesDesc).toEqual(sortedDesc);
  });

  test('should reject unauthorized access', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/quiz?page=1&pageSize=20`);
    expect(res.status()).toBe(401);
  });

  test('should exclude disabled quizzes from public listing', async ({ request }) => {
    // Disable one of our test quizzes
    const quizToDisable = createdQuizIds[0];
    await request.put(`${API_BASE_URL}/quiz/${quizToDisable}`, {
      headers: { 'X-Session-Token': adminToken },
      data: { disabled: true },
    });

    // Public listing – should exclude it
    const resPublic = await fetchPaginated(request, { page: 1, pageSize: 50 });
    expect(resPublic.status()).toBe(200);
    const bodyPublic = await resPublic.json();
    expect(bodyPublic.total).toBe(totalTestQuizzes - 1);
    const disabledInPublic = bodyPublic.items.some(q => q.id === quizToDisable);
    expect(disabledInPublic).toBe(false);

    // mine=true listing – should include it (because we search by tag)
    const resMine = await request.get(
      `${API_BASE_URL}/quiz?mine=true&search=${testTag}&page=1&pageSize=50`,
      { headers: { 'X-Session-Token': adminToken } }
    );
    expect(resMine.status()).toBe(200);
    const bodyMine = await resMine.json();
    expect(bodyMine.total).toBe(totalTestQuizzes); // all 25 appear
    const disabledInMine = bodyMine.items.some(q => q.id === quizToDisable);
    expect(disabledInMine).toBe(true);
  });
});