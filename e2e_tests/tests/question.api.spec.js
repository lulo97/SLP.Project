import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5140/api';

const adminUser = {
  username: 'admin',
  password: '123',
};

// Generate unique question data
function generateQuestion(type = 'multiple_choice') {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  const baseQuestion = {
    multiple_choice: {
      type: 'multiple_choice',
      content: `What is the capital of France? ${id}`,
      explanation: `Paris is the capital of France. ${id}`,
      metadataJson: JSON.stringify({
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris'
      }),
      tagNames: ['geography', 'capitals', 'france', 'test']
    },
    true_false: {
      type: 'true_false',
      content: `The Earth is flat. ${id}`,
      explanation: `The Earth is an oblate spheroid. ${id}`,
      metadataJson: JSON.stringify({
        correctAnswer: false
      }),
      tagNames: ['science', 'facts', 'test']
    },
    fill_blank: {
      type: 'fill_blank',
      content: `The chemical symbol for water is ____. ${id}`,
      explanation: `H2O is the chemical formula for water. ${id}`,
      metadataJson: JSON.stringify({
        correctAnswer: 'H2O'
      }),
      tagNames: ['chemistry', 'science', 'test']
    }
  };

  return baseQuestion[type] || baseQuestion.multiple_choice;
}

test.describe('Questions API - Complete Lifecycle', () => {
  let adminToken;
  let createdQuestionIds = [];

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

  test('should create different types of questions', async ({ request }) => {
    const questionTypes = ['multiple_choice', 'true_false', 'fill_blank'];

    for (const type of questionTypes) {
      const questionData = generateQuestion(type);

      const createRes = await request.post(`${API_BASE_URL}/question`, {
        headers: { 'X-Session-Token': adminToken },
        data: questionData,
      });

      expect(createRes.status()).toBe(201);

      const createdQuestion = await createRes.json();
      expect(createdQuestion.id).toBeDefined();
      expect(createdQuestion.type).toBe(type);
      expect(createdQuestion.content).toBe(questionData.content);
      expect(createdQuestion.tags).toEqual(expect.arrayContaining(questionData.tagNames));

      createdQuestionIds.push(createdQuestion.id);

      const getRes = await request.get(`${API_BASE_URL}/question/${createdQuestion.id}`, {
        headers: { 'X-Session-Token': adminToken },
      });

      expect(getRes.status()).toBe(200);
      const getQuestion = await getRes.json();
      expect(getQuestion.id).toBe(createdQuestion.id);
    }
  });

  test('should get all questions with filtering', async ({ request }) => {
    const questions = [];
    for (let i = 0; i < 3; i++) {
      const questionData = generateQuestion('multiple_choice');
      const createRes = await request.post(`${API_BASE_URL}/question`, {
        headers: { 'X-Session-Token': adminToken },
        data: questionData,
      });
      const q = await createRes.json();
      questions.push(q);
      createdQuestionIds.push(q.id);
    }

    const searchRes = await request.get(`${API_BASE_URL}/question?search=capital`, {
      headers: { 'X-Session-Token': adminToken },
    });

    expect(searchRes.status()).toBe(200);
    const searchResults = await searchRes.json();
    expect(Array.isArray(searchResults)).toBe(true);

    const typeRes = await request.get(`${API_BASE_URL}/question?type=multiple_choice`, {
      headers: { 'X-Session-Token': adminToken },
    });

    expect(typeRes.status()).toBe(200);
    const typeResults = await typeRes.json();
    expect(Array.isArray(typeResults)).toBe(true);
    typeResults.forEach(q => {
      expect(q.type).toBe('multiple_choice');
    });

    const myRes = await request.get(`${API_BASE_URL}/question?mine=true`, {
      headers: { 'X-Session-Token': adminToken },
    });

    expect(myRes.status()).toBe(200);
    const myQuestions = await myRes.json();
    expect(Array.isArray(myQuestions)).toBe(true);
  });

  test('should update an existing question', async ({ request }) => {
    const questionData = generateQuestion('multiple_choice');
    const createRes = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: questionData,
    });

    expect(createRes.status()).toBe(201);
    const createdQuestion = await createRes.json();
    createdQuestionIds.push(createdQuestion.id);

    // Update only the fields that exist in the backend DTO
    const updateData = {
      content: `${createdQuestion.content} (Updated)`,
      explanation: `${createdQuestion.explanation} (Updated explanation)`,
      tagNames: [...questionData.tagNames, 'updated']
    };

    const updateRes = await request.put(`${API_BASE_URL}/question/${createdQuestion.id}`, {
      headers: { 'X-Session-Token': adminToken },
      data: updateData,
    });

    expect(updateRes.status()).toBe(200);

    const updatedQuestion = await updateRes.json();
    expect(updatedQuestion.id).toBe(createdQuestion.id);
    expect(updatedQuestion.content).toBe(updateData.content);
    expect(updatedQuestion.explanation).toBe(updateData.explanation);
    expect(updatedQuestion.tags).toContain('updated');

    const getRes = await request.get(`${API_BASE_URL}/question/${createdQuestion.id}`, {
      headers: { 'X-Session-Token': adminToken },
    });

    expect(getRes.status()).toBe(200);
    const getQuestion = await getRes.json();
    expect(getQuestion.content).toBe(updateData.content);
  });

  test('should handle unauthorized access', async ({ request }) => {
    const questionData = generateQuestion();
    const createRes = await request.post(`${API_BASE_URL}/question`, {
      data: questionData,
    });
    expect(createRes.status()).toBe(401);

    const getRes = await request.get(`${API_BASE_URL}/question?mine=true`);
    expect(getRes.status()).toBe(401);
  });

  test('should handle not found errors', async ({ request }) => {
    const nonExistentId = 999999;

    const getRes = await request.get(`${API_BASE_URL}/question/${nonExistentId}`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(getRes.status()).toBe(404);

    const updateRes = await request.put(`${API_BASE_URL}/question/${nonExistentId}`, {
      headers: { 'X-Session-Token': adminToken },
      data: { content: 'test' },
    });
    expect(updateRes.status()).toBe(404);

    const deleteRes = await request.delete(`${API_BASE_URL}/question/${nonExistentId}`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(deleteRes.status()).toBe(404);
  });

  test('should create question with multiple tags', async ({ request }) => {
    const questionData = {
      type: 'multiple_choice',
      content: `Question with multiple tags ${Date.now()}`,
      explanation: 'Testing multiple tags',
      tagNames: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
    };

    const createRes = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: questionData,
    });

    expect(createRes.status()).toBe(201);

    const createdQuestion = await createRes.json();
    expect(createdQuestion.tags).toHaveLength(5);
    expect(createdQuestion.tags).toEqual(expect.arrayContaining(questionData.tagNames));

    createdQuestionIds.push(createdQuestion.id);
  });

  test('should create question without tags', async ({ request }) => {
    const questionData = {
      type: 'multiple_choice',
      content: `Question without tags ${Date.now()}`,
      explanation: 'Testing no tags'
    };

    const createRes = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: questionData,
    });

    expect(createRes.status()).toBe(201);

    const createdQuestion = await createRes.json();
    expect(createdQuestion.tags).toHaveLength(0);

    createdQuestionIds.push(createdQuestion.id);
  });

  test('should complete full CRUD cycle', async ({ request }) => {
    const createData = generateQuestion('multiple_choice');
    const createRes = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: createData,
    });

    expect(createRes.status()).toBe(201);
    const question = await createRes.json();
    const questionId = question.id;
    createdQuestionIds.push(questionId);

    const getRes = await request.get(`${API_BASE_URL}/question/${questionId}`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(getRes.status()).toBe(200);
    const getQuestion = await getRes.json();
    expect(getQuestion.id).toBe(questionId);

    const updateData = {
      content: `${createData.content} [UPDATED]`,
      explanation: `${createData.explanation} [UPDATED]`,
    };
    const updateRes = await request.put(`${API_BASE_URL}/question/${questionId}`, {
      headers: { 'X-Session-Token': adminToken },
      data: updateData,
    });
    expect(updateRes.status()).toBe(200);
    const updatedQuestion = await updateRes.json();
    expect(updatedQuestion.content).toBe(updateData.content);

    const deleteRes = await request.delete(`${API_BASE_URL}/question/${questionId}`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(deleteRes.status()).toBe(204);

    const getAfterDeleteRes = await request.get(`${API_BASE_URL}/question/${questionId}`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(getAfterDeleteRes.status()).toBe(404);

    createdQuestionIds = createdQuestionIds.filter(id => id !== questionId);
  });

  test('should search questions by tags', async ({ request }) => {
    const uniqueTag = `searchtest-${Date.now()}`;
    const questionData = {
      type: 'multiple_choice',
      content: `Search test question ${Date.now()}`,
      explanation: 'Testing search by tags',
      tagNames: [uniqueTag, 'searchable']
    };

    const createRes = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: questionData,
    });

    expect(createRes.status()).toBe(201);
    const createdQuestion = await createRes.json();
    createdQuestionIds.push(createdQuestion.id);

    const searchRes = await request.get(`${API_BASE_URL}/question?tags=${uniqueTag}`, {
      headers: { 'X-Session-Token': adminToken },
    });

    expect(searchRes.status()).toBe(200);
    const results = await searchRes.json();

    const found = results.some(q => q.id === createdQuestion.id);
    expect(found).toBe(true);
  });
});

test.describe('Questions API - Multiple Runs', () => {
  let adminToken; // changed from const to let

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