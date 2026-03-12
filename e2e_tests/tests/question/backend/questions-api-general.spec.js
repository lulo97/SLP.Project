// questions-api-general.spec.js
const { test, expect } = require('@playwright/test');
const { API_BASE_URL, adminUser, generateQuestion } = require('./questions-api-test-utils');

test.describe('Questions API - General', () => {
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

  test('should create different types of questions', async ({ request }) => {
    const questionTypes = ['multiple_choice', 'true_false', 'fill_blank', 'matching', 'ordering'];

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
      metadataJson: JSON.stringify({
        options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
        correctAnswers: ['a']
      }),
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
      explanation: 'Testing no tags',
      metadataJson: JSON.stringify({
        options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
        correctAnswers: ['a']
      })
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

    const index = createdQuestionIds.indexOf(questionId);
    if (index > -1) createdQuestionIds.splice(index, 1);
  });

  test('should search questions by tags', async ({ request }) => {
    const uniqueTag = `searchtest-${Date.now()}`;
    const questionData = {
      type: 'multiple_choice',
      content: `Search test question ${Date.now()}`,
      explanation: 'Testing search by tags',
      metadataJson: JSON.stringify({
        options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
        correctAnswers: ['a']
      }),
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

  test('should reject missing metadata for any type', async ({ request }) => {
    const types = ['multiple_choice', 'true_false', 'fill_blank', 'matching', 'ordering'];
    for (const type of types) {
      const base = generateQuestion(type);
      const invalidData = { ...base, metadataJson: null };
      const res = await request.post(`${API_BASE_URL}/question`, {
        headers: { 'X-Session-Token': adminToken },
        data: invalidData,
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Metadata is required');
    }
  });

  test('should reject invalid JSON in metadata', async ({ request }) => {
    const invalidData = generateQuestion('multiple_choice');
    invalidData.metadataJson = 'this is not json';
    const res = await request.post(`${API_BASE_URL}/question`, {
      headers: { 'X-Session-Token': adminToken },
      data: invalidData,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON format');
  });
});