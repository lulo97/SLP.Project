import { test, expect } from '@playwright/test';
import {
  API_BASE_URL,
  generateUser,
  registerUser,
  login,
  loginAsAdmin,
  createQuiz,
  createComment,
  deleteUser,
} from './helpers.js';

test.describe('Comments', () => {
  let testUserData;
  let createdUser;
  let userToken;
  let adminToken;
  let quiz;

  test.beforeEach(async ({ request }) => {
    testUserData = generateUser();
    createdUser = await registerUser(request, testUserData);
    userToken = await login(request, testUserData.username, testUserData.password);
    quiz = await createQuiz(request, userToken, 'Comment Test Quiz');
  });

  test.afterEach(async ({ request }) => {
    adminToken = await loginAsAdmin(request);
    await deleteUser(request, adminToken, createdUser.id);
  });

  test('create comment, edit, delete, admin restore', async ({ request }) => {
    // Create comment
    const comment = await createComment(request, userToken, 'quiz', quiz.id, 'This is a test comment');
    expect(comment.content).toBe('This is a test comment');
    expect(comment.userId).toBe(createdUser.id);

    // Edit comment
    const editRes = await request.put(`${API_BASE_URL}/comments/${comment.id}`, {
      headers: { 'X-Session-Token': userToken },
      data: { content: 'Updated comment content' },
    });
    expect(editRes.status()).toBe(200);
    const edited = await editRes.json();
    expect(edited.content).toBe('Updated comment content');

    // Get comments for target
    const getRes = await request.get(`${API_BASE_URL}/comments?targetType=quiz&targetId=${quiz.id}`);
    expect(getRes.status()).toBe(200);
    const comments = await getRes.json();
    expect(comments.length).toBe(1);
    expect(comments[0].content).toBe('Updated comment content');

    // User deletes own comment
    const deleteRes = await request.delete(`${API_BASE_URL}/comments/${comment.id}`, {
      headers: { 'X-Session-Token': userToken },
    });
    expect(deleteRes.status()).toBe(204);

    // Verify comment is gone (soft deleted)
    const getAfterDelete = await request.get(`${API_BASE_URL}/comments?targetType=quiz&targetId=${quiz.id}`);
    expect(getAfterDelete.status()).toBe(200);
    const afterDelete = await getAfterDelete.json();
    expect(afterDelete.length).toBe(0);

    // Admin restore comment
    adminToken = await loginAsAdmin(request);
    const restoreRes = await request.post(`${API_BASE_URL}/comments/${comment.id}/restore`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(restoreRes.status()).toBe(200);

    // Verify comment is back
    const getAfterRestore = await request.get(`${API_BASE_URL}/comments?targetType=quiz&targetId=${quiz.id}`);
    expect(getAfterRestore.status()).toBe(200);
    const afterRestore = await getAfterRestore.json();
    expect(afterRestore.length).toBe(1);
    expect(afterRestore[0].content).toBe('Updated comment content');
  });

  test('admin can delete any comment', async ({ request }) => {
    // Create comment as user
    const comment = await createComment(request, userToken, 'quiz', quiz.id, 'Admin delete test');

    // Admin deletes it
    adminToken = await loginAsAdmin(request);
    const deleteRes = await request.delete(`${API_BASE_URL}/comments/${comment.id}`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(deleteRes.status()).toBe(204);

    // Verify deleted
    const getRes = await request.get(`${API_BASE_URL}/comments?targetType=quiz&targetId=${quiz.id}`);
    expect(getRes.status()).toBe(200);
    const comments = await getRes.json();
    expect(comments.length).toBe(0);
  });
});