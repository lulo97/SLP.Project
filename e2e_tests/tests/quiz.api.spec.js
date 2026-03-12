import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5140/api';

const adminUser = {
  username: 'admin',
  password: '123',
};

function generateQuiz() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    title: `Playwright Quiz ${id}`,
    description: 'Quiz created by Playwright API test',
    visibility: 'private',
    tagNames: ['playwright', 'api-test']
  };
}

test.describe('Quiz lifecycle flow', () => {

  test('admin login → create → get → update → duplicate → delete', async ({ request }) => {

    let adminToken;
    let quizId;
    let duplicateQuizId;

    const quiz = generateQuiz();

    // -----------------------------
    // 1. Admin login
    // -----------------------------
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });

    expect(loginRes.status()).toBe(200);

    const loginBody = await loginRes.json();
    expect(loginBody.token).toBeTruthy();

    adminToken = loginBody.token;

    // -----------------------------
    // 2. Create quiz
    // -----------------------------
    const createRes = await request.post(`${API_BASE_URL}/quiz`, {
      headers: {
        'X-Session-Token': adminToken,
      },
      data: quiz,
    });

    expect(createRes.status()).toBe(201);

    const createdQuiz = await createRes.json();

    expect(createdQuiz.title).toBe(quiz.title);
    expect(createdQuiz.description).toBe(quiz.description);

    quizId = createdQuiz.id;

    // -----------------------------
    // 3. Get quiz (AUTHENTICATED)
    // -----------------------------
    const getRes = await request.get(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: {
        'X-Session-Token': adminToken,  // Added token here
      },
    });

    expect(getRes.status()).toBe(200);

    const getQuiz = await getRes.json();

    expect(getQuiz.id).toBe(quizId);
    expect(getQuiz.title).toBe(quiz.title);

    // -----------------------------
    // 4. Update quiz
    // -----------------------------
    const updatedTitle = `${quiz.title} Updated`;

    const updateRes = await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: {
        'X-Session-Token': adminToken,
      },
      data: {
        title: updatedTitle,
        description: 'Updated description',
      },
    });

    expect(updateRes.status()).toBe(200);

    const updatedQuiz = await updateRes.json();

    expect(updatedQuiz.title).toBe(updatedTitle);

    // -----------------------------
    // 5. Duplicate quiz
    // -----------------------------
    const duplicateRes = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/duplicate`,
      {
        headers: {
          'X-Session-Token': adminToken,
        },
      }
    );

    expect(duplicateRes.status()).toBe(201);

    const duplicateQuiz = await duplicateRes.json();

    expect(duplicateQuiz.title).toContain('(Copy)');

    duplicateQuizId = duplicateQuiz.id;

    // -----------------------------
    // 6. Get duplicate quiz (AUTHENTICATED)
    // -----------------------------
    const getDuplicateRes = await request.get(`${API_BASE_URL}/quiz/${duplicateQuizId}`, {
      headers: {
        'X-Session-Token': adminToken,  // Added token here
      },
    });

    expect(getDuplicateRes.status()).toBe(200);

    const getDuplicateQuiz = await getDuplicateRes.json();
    expect(getDuplicateQuiz.id).toBe(duplicateQuizId);

    // -----------------------------
    // 7. Delete duplicate quiz
    // -----------------------------
    const deleteDuplicateRes = await request.delete(
      `${API_BASE_URL}/quiz/${duplicateQuizId}`,
      {
        headers: {
          'X-Session-Token': adminToken,
        },
      }
    );

    expect(deleteDuplicateRes.status()).toBe(204);

    // -----------------------------
    // 8. Delete original quiz
    // -----------------------------
    const deleteRes = await request.delete(
      `${API_BASE_URL}/quiz/${quizId}`,
      {
        headers: {
          'X-Session-Token': adminToken,
        },
      }
    );

    expect(deleteRes.status()).toBe(204);

    // -----------------------------
    // 9. Verify quiz is deleted (UNAUTHENTICATED - should return 404)
    // -----------------------------
    const getAfterDeleteRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}`
      // No token needed here since we expect 404 anyway
    );

    expect(getAfterDeleteRes.status()).toBe(404);

    // -----------------------------
    // 10. Verify with token also returns 404 (optional)
    // -----------------------------
    const getAfterDeleteWithTokenRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}`,
      {
        headers: {
          'X-Session-Token': adminToken,
        },
      }
    );

    expect(getAfterDeleteWithTokenRes.status()).toBe(404);

  });

});