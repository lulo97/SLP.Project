import { expect } from "@playwright/test";

export const FRONTEND_URL = "http://localhost:4000";
export const API_BASE_URL = "http://localhost:3001/api";

export const adminUser = {
  username: "admin",
  password: "123",
};

export function generateUniqueSource(base) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    title: `${base} ${id}`,
    content: `This is the content for ${base} ${id}. It contains some text.`,
    url: `https://example.com/${id}`,
  };
}

export async function authenticate(request) {
  const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      username: adminUser.username,
      password: adminUser.password,
    },
  });
  expect(loginRes.status()).toBe(200);
  const loginBody = await loginRes.json();
  return loginBody.token; // session token
}

export async function createAuthenticatedPage(browser, token) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript((token) => {
    localStorage.setItem("session_token", token);
  }, token);

  await page.goto(`${FRONTEND_URL}/source`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="source-list"]')).toBeVisible({ timeout: 10000 });
  return page;
}

export async function deleteSource(page, id) {
  await page.goto(`${FRONTEND_URL}/source/${id}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="source-detail-delete-button"]').waitFor();
  await page.click('[data-testid="source-detail-delete-button"]');
  await page.click('.ant-popconfirm-buttons .ant-btn-primary');
  await expect(page.locator('.ant-message-success:has-text("Source deleted")')).toBeVisible();
  await page.waitForURL("**/source");
}

export async function verifySourceDeletedViaApi(playwrightRequest, id, token) {
  const response = await playwrightRequest.get(`${API_BASE_URL}/source/${id}`, {
    headers: { "X-Session-Token": token }, // Backend expects this header
  });
  expect(response.status()).toBe(404);
}