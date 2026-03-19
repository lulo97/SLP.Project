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

test.describe('User lifecycle flow', () => {
  test('create → login → /me → logout → admin delete', async ({ request }) => {
    const user = generateUser();

    let userToken;
    let userId;
    let adminToken;

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

    expect(createdUser.email).toBe(user.email);
    expect(createdUser.username).toBe(user.username);

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
    expect(loginBody.token).toBeTruthy();

    userToken = loginBody.token;

    // -----------------------------
    // 3. Get current user (/users/me)
    // -----------------------------
    const meRes = await request.get(`${API_BASE_URL}/users/me`, {
      headers: {
        'X-Session-Token': userToken,
      },
    });

    expect(meRes.status()).toBe(200);

    const meBody = await meRes.json();

    expect(meBody.id.toString()).toBe(userId);
    expect(meBody.username).toBe(user.username);
    expect(meBody.email).toBe(user.email);

    // -----------------------------
    // 4. Logout
    // -----------------------------
    const logoutRes = await request.post(`${API_BASE_URL}/auth/logout`, {
      headers: {
        'X-Session-Token': userToken,
      },
    });

    expect(logoutRes.status()).toBe(200);
    const logoutBody = await logoutRes.json();
    expect(logoutBody.message).toBe('Logged out successfully');

    // -----------------------------
    // 5. Admin login
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
    // 6. Admin deletes created user
    // -----------------------------
    const deleteRes = await request.delete(
      `${API_BASE_URL}/users/${userId}`,
      {
        headers: {
          'X-Session-Token': adminToken,
        },
      }
    );

    expect(deleteRes.status()).toBe(200);

    const deleteBody = await deleteRes.json();
    expect(deleteBody.message).toBe('User deleted successfully');

    // -----------------------------
    // 7. Sanity check: deleted user cannot login
    // -----------------------------
    const loginAfterDeleteRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: user.username,
        password: user.password,
      },
    });

    expect(loginAfterDeleteRes.status()).toBe(401);

    const loginAfterDeleteBody = await loginAfterDeleteRes.json();
    expect(loginAfterDeleteBody.message).toBe('Invalid credentials');
  });
});