import { test, expect } from '@playwright/test';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';           // your backend API
const MAILHOG_API_URL = 'http://localhost:8025/api';       // MailHog API

// Test user credentials (must exist in the database)
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
};

// Helper to get the latest email from MailHog and extract a token
async function extractTokenFromEmail(subjectContains) {
  // Give the email a moment to arrive
  await new Promise(resolve => setTimeout(resolve, 1000));

  const response = await fetch(`${MAILHOG_API_URL}/v2/messages`);
  const data = await response.json();
  const messages = data.items;

  // Find the most recent email with the expected subject
  const email = messages.find(msg =>
    msg.Content.Headers.Subject[0].includes(subjectContains)
  );

  if (!email) {
    throw new Error(`No email found with subject containing "${subjectContains}"`);
  }

  const body = email.Content.Body;
  // Token is typically in the format: "Reset token: ..." or "Verification token: ..."
  const tokenMatch = body.match(/(?:Reset token|Verification token):\s*(\S+)/);
  if (!tokenMatch) {
    throw new Error('Token not found in email body');
  }
  return tokenMatch[1];
}

test.describe('API End-to-End Tests (via HTTP only)', () => {
  let authToken;

  test.describe('Authentication', () => {
    test('POST /auth/login – success', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('userId');
      expect(body.email).toBe(testUser.email);
      authToken = body.token; // store for later tests
    });

    test('POST /auth/login – invalid credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: 'wrong@example.com',
          password: 'wrong',
        },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.message).toBe('Invalid credentials');
    });

    test('POST /auth/login – rate limiting', async ({ request }) => {
      // Make 10 requests with wrong credentials – all should be 401
      for (let i = 0; i < 10; i++) {
        const response = await request.post(`${API_BASE_URL}/auth/login`, {
          data: {
            email: 'rate@test.com',
            password: 'wrong',
          },
        });
        expect(response.status()).toBe(401);
      }
      // 11th request should be rate limited
      const response = await request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: 'rate@test.com',
          password: 'wrong',
        },
      });
      expect(response.status()).toBe(429);
    });
  });

  test.describe('Authenticated Endpoints', () => {
    test.beforeAll(async ({ request }) => {
      // Ensure we have a valid token
      if (!authToken) {
        const res = await request.post(`${API_BASE_URL}/auth/login`, {
          data: {
            email: testUser.email,
            password: testUser.password,
          },
        });
        const body = await res.json();
        authToken = body.token;
      }
    });

    test('POST /auth/logout – success', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/logout`, {
        headers: { 'X-Session-Token': authToken },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Logged out successfully');
    });

    test('POST /auth/logout – no token', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/logout`);
      expect(response.status()).toBe(401);
    });

    test('GET /users/me – success', async ({ request }) => {
      // Login again to get a fresh token
      const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });
      const { token } = await loginRes.json();

      const response = await request.get(`${API_BASE_URL}/users/me`, {
        headers: { 'X-Session-Token': token },
      });
      expect(response.status()).toBe(200);
      const user = await response.json();
      expect(user.email).toBe(testUser.email);
      expect(user.username).toBe(testUser.name);
    });

    test('GET /users/me – no token', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/users/me`);
      expect(response.status()).toBe(401);
    });

    test('PUT /users/me – success', async ({ request }) => {
      // Login again
      const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });
      const { token } = await loginRes.json();

      const newName = 'Updated Name';
      const response = await request.put(`${API_BASE_URL}/users/me`, {
        headers: { 'X-Session-Token': token },
        data: {
          name: newName,
          avatarUrl: 'https://example.com/avatar.png',
        },
      });
      expect(response.status()).toBe(200);
      const user = await response.json();
      expect(user.username).toBe(newName);

      // Verify update persisted
      const getRes = await request.get(`${API_BASE_URL}/users/me`, {
        headers: { 'X-Session-Token': token },
      });
      const updatedUser = await getRes.json();
      expect(updatedUser.username).toBe(newName);
    });

    test('PUT /users/me – no token', async ({ request }) => {
      const response = await request.put(`${API_BASE_URL}/users/me`, {
        data: { name: 'Should fail' },
      });
      expect(response.status()).toBe(401);
    });

    test('POST /users/me/verify-email/send – success', async ({ request }) => {
      const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });
      const { token } = await loginRes.json();

      const response = await request.post(`${API_BASE_URL}/users/me/verify-email/send`, {
        headers: { 'X-Session-Token': token },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Verification email sent.');
    });

    test('POST /users/me/verify-email/send – no token', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/users/me/verify-email/send`);
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Password Reset Flow', () => {
    test('POST /auth/reset-password – existing email', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/reset-password`, {
        data: { email: testUser.email },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Password reset email sent if account exists.');
    });

    test('POST /auth/reset-password – non‑existent email', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/reset-password`, {
        data: { email: 'nonexistent@example.com' },
      });
      expect(response.status()).toBe(200); // no enumeration
      const body = await response.json();
      expect(body.message).toBe('Password reset email sent if account exists.');
    });

    test('POST /auth/reset-password/confirm – valid token (via MailHog)', async ({ request }) => {
      // Step 1: request password reset
      await request.post(`${API_BASE_URL}/auth/reset-password`, {
        data: { email: testUser.email },
      });

      // Step 2: retrieve token from MailHog
      const token = await extractTokenFromEmail('Password Reset');

      // Step 3: confirm reset with new password
      const newPassword = 'NewPassword123!';
      const response = await request.post(`${API_BASE_URL}/auth/reset-password/confirm`, {
        data: {
          token,
          newPassword,
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Password reset successful');

      // Step 4: verify login works with new password
      const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: newPassword,
        },
      });
      expect(loginRes.status()).toBe(200);

      // Step 5: revert password to original for other tests
      await request.post(`${API_BASE_URL}/auth/reset-password`, {
        data: { email: testUser.email },
      });
      const revertToken = await extractTokenFromEmail('Password Reset');
      await request.post(`${API_BASE_URL}/auth/reset-password/confirm`, {
        data: {
          token: revertToken,
          newPassword: testUser.password,
        },
      });
    });

    test('POST /auth/reset-password/confirm – invalid token', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/reset-password/confirm`, {
        data: {
          token: 'invalid-token',
          newPassword: 'anything',
        },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toBe('Invalid or expired token');
    });
  });

  test.describe('Email Verification Flow', () => {
    test('POST /auth/verify-email – valid token (via MailHog)', async ({ request }) => {
      // Step 1: log in to trigger verification email
      const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });
      const { token: authToken } = await loginRes.json();

      await request.post(`${API_BASE_URL}/users/me/verify-email/send`, {
        headers: { 'X-Session-Token': authToken },
      });

      // Step 2: retrieve token from MailHog
      const verificationToken = await extractTokenFromEmail('Verify your email');

      // Step 3: verify email
      const response = await request.post(`${API_BASE_URL}/auth/verify-email`, {
        data: { token: verificationToken },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Email verified successfully');
    });

    test('POST /auth/verify-email – invalid token', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/verify-email`, {
        data: { token: 'invalid-token' },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toBe('Invalid verification token');
    });
  });
});