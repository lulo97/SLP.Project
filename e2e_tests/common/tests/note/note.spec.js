// frontend-vue/tests/notes.spec.js
import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5140/api';

const adminUser = {
  username: 'admin',
  password: '123',
};

function generateUser() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    username: `user_${id}`,
    email: `user_${id}@example.com`,
    password: 'TestPassword123!',
  };
}

test.describe('Note CRUD operations', () => {
  test('create, read, update, delete a note', async ({ request }) => {
    const user = generateUser();
    let userToken;
    let userId;
    let adminToken;
    let noteId;

    // -----------------------------
    // 1. Register new user
    // -----------------------------
    const registerRes = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        username: user.username,
        email: user.email,
        password: user.password,
      },
    });
    expect(registerRes.status()).toBe(200);
    const createdUser = await registerRes.json();
    userId = createdUser.id.toString();

    // -----------------------------
    // 2. Login with new user
    // -----------------------------
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: user.username,
        password: user.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    userToken = loginBody.token;

    // -----------------------------
    // 3. Create a note
    // -----------------------------
    const noteData = {
      title: 'Test Note',
      content: 'This is a test note content.',
    };
    const createRes = await request.post(`${API_BASE_URL}/notes`, {
      headers: { 'X-Session-Token': userToken },
      data: noteData,
    });
    expect(createRes.status()).toBe(201); // Created
    const createdNote = await createRes.json();
    noteId = createdNote.id;
    expect(createdNote.title).toBe(noteData.title);
    expect(createdNote.content).toBe(noteData.content);
    expect(createdNote.createdAt).toBeTruthy();

    // -----------------------------
    // 4. Get all notes (verify list contains the new note)
    // -----------------------------
    const listRes = await request.get(`${API_BASE_URL}/notes`, {
      headers: { 'X-Session-Token': userToken },
    });
    expect(listRes.status()).toBe(200);
    const notes = await listRes.json();
    const found = notes.find(n => n.id === noteId);
    expect(found).toBeTruthy();
    expect(found.title).toBe(noteData.title);

    // -----------------------------
    // 5. Get single note by ID
    // -----------------------------
    const getRes = await request.get(`${API_BASE_URL}/notes/${noteId}`, {
      headers: { 'X-Session-Token': userToken },
    });
    expect(getRes.status()).toBe(200);
    const fetchedNote = await getRes.json();
    expect(fetchedNote.id).toBe(noteId);
    expect(fetchedNote.title).toBe(noteData.title);

    // -----------------------------
    // 6. Update the note
    // -----------------------------
    const updatedData = {
      title: 'Updated Test Note',
      content: 'This is the updated content.',
    };
    const updateRes = await request.put(`${API_BASE_URL}/notes/${noteId}`, {
      headers: { 'X-Session-Token': userToken },
      data: updatedData,
    });
    expect(updateRes.status()).toBe(200);
    const updatedNote = await updateRes.json();
    expect(updatedNote.title).toBe(updatedData.title);
    expect(updatedNote.content).toBe(updatedData.content);
    expect(updatedNote.updatedAt).not.toBe(updatedNote.createdAt); // updated timestamp changed

    // -----------------------------
    // 7. Delete the note
    // -----------------------------
    const deleteRes = await request.delete(`${API_BASE_URL}/notes/${noteId}`, {
      headers: { 'X-Session-Token': userToken },
    });
    expect(deleteRes.status()).toBe(204); // No Content

    // -----------------------------
    // 8. Verify note is gone
    // -----------------------------
    const getAfterDeleteRes = await request.get(`${API_BASE_URL}/notes/${noteId}`, {
      headers: { 'X-Session-Token': userToken },
    });
    expect(getAfterDeleteRes.status()).toBe(404);

    // -----------------------------
    // 9. Logout (optional)
    // -----------------------------
    const logoutRes = await request.post(`${API_BASE_URL}/auth/logout`, {
      headers: { 'X-Session-Token': userToken },
    });
    expect(logoutRes.status()).toBe(200);

    // -----------------------------
    // 10. Admin login to clean up user
    // -----------------------------
    const adminLoginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });
    expect(adminLoginRes.status()).toBe(200);
    const adminLoginBody = await adminLoginRes.json();
    adminToken = adminLoginBody.token;

    // -----------------------------
    // 11. Admin deletes the created user
    // -----------------------------
    const deleteUserRes = await request.delete(`${API_BASE_URL}/users/${userId}`, {
      headers: { 'X-Session-Token': adminToken },
    });
    expect(deleteUserRes.status()).toBe(200);
    const deleteUserBody = await deleteUserRes.json();
    expect(deleteUserBody.message).toBe('User deleted successfully');

    // Optional: verify user cannot log in
    const loginAfterDeleteRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: user.username,
        password: user.password,
      },
    });
    expect(loginAfterDeleteRes.status()).toBe(401);
  });
});