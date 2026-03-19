import { test, expect } from '@playwright/test';
import {
  FRONTEND_URL,
  API_BASE_URL,
  loginAsAdmin,
  createAuthenticatedPage,
  createQuiz,
  deleteQuizViaApi,
  createSourceViaApi,
  deleteSourceViaApi,
} from './quiz-test-utils';

test.describe('Quiz Sources', () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    authToken = await loginAsAdmin(request);
  });

  test('Attach and detach a source', async ({ browser, request }) => {
    const source = await createSourceViaApi(authToken);

    const page = await createAuthenticatedPage(browser, authToken);
    const { id } = await createQuiz(page);

    await page.click('[data-testid="attach-source-button"]');
    // Wait for modal content to appear (using class)
    await page.waitForSelector('.ant-modal-content', { state: 'visible', timeout: 10000 });
    // Brief pause for the modal to fully render
    await page.waitForTimeout(300);

    await page.click(`[data-testid="source-checkbox-${source.id}"]`);
    await page.click('[data-testid="attach-sources-submit"]');

    await expect(page.locator(`[data-testid="source-tag-${source.id}"]`)).toBeVisible();

    await page.click(`[data-testid="source-tag-${source.id}"] .ant-tag-close-icon`);
    await expect(page.locator(`[data-testid="source-tag-${source.id}"]`)).not.toBeVisible();

    // API check
    const sourcesResponse = await request.get(`${API_BASE_URL}/quiz/${id}/sources`, {
      headers: { 'X-Session-Token': authToken },
    });
    expect(sourcesResponse.status()).toBe(200);
    const sources = await sourcesResponse.json();
    expect(sources.find(s => s.id === source.id)).toBeUndefined();

    await deleteQuizViaApi(request, authToken, id);
    await deleteSourceViaApi(authToken, source.id);
    await page.close();
  });
});