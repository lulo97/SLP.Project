import { test, expect } from "@playwright/test";

const FRONTEND_URL = "http://localhost:4000";
const API_BASE_URL = "http://localhost:3001/api";

const adminUser = {
  username: "admin",
  password: "123",
};

function generateUniqueQuestion(base) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    title: `${base} ${id}`,
    description: `Description for ${base} ${id}`,
    tags: ["test", base, id.toString()],
  };
}

test.describe("Question CRUD operations", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    authToken = loginBody.token;
  });

  async function createAuthenticatedPage(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript((token) => {
      localStorage.setItem("session_token", token);
    }, authToken);

    await page.goto(`${FRONTEND_URL}/questions`);
    await expect(page.locator('[data-testid="question-search"]')).toBeVisible({
      timeout: 10000,
    });

    return page;
  }

  async function createQuestion(page, type, fillSpecific) {
    const unique = generateUniqueQuestion(type);
    await page.goto(`${FRONTEND_URL}/question/new`);

    // Fill common fields
    await page.fill('[data-testid="question-title"]', unique.title);
    await page.fill('[data-testid="question-description"]', unique.description);

    // Handle Ant Design Select for question type
    const typeLabelMap = {
      multiple_choice: "Multiple Choice",
      true_false: "True/False",
      fill_blank: "Fill Blank",
      ordering: "Ordering",
      matching: "Matching",
    };
    await page.click('[data-testid="question-type"]');
    await page.waitForSelector(
      ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
    );
    await page.click(
      `.ant-select-dropdown .ant-select-item-option:has-text("${typeLabelMap[type]}")`,
    );

    try {
      await page.waitForSelector(".ant-select-dropdown", {
        state: "hidden",
        timeout: 2000,
      });
    } catch {
      await page.keyboard.press("Escape");
      await page.waitForSelector(".ant-select-dropdown", { state: "hidden" });
    }

    // Fill type-specific fields
    await fillSpecific(page);

    // Add tags
    for (const tag of unique.tags) {
      await page.locator('[data-testid="question-tags"] input').fill(tag);
      await page.locator('[data-testid="question-tags"] input').press("Enter");
    }
    await page.keyboard.press("Escape");
    await page.waitForSelector(".ant-select-dropdown", { state: "hidden" });

    // Submit
    await page.click('[data-testid="submit-question"]');

    // Wait for redirect and specific success message
    await page.waitForURL("**/questions");
    await expect(page.locator('.ant-message-success:has-text("Question created")')).toBeVisible();

    return unique;
  }

  async function findQuestionId(page, title) {
    const questionItem = page.locator(`.ant-list-item:has-text("${title}")`);
    await expect(questionItem).toBeVisible();
    const testId = await questionItem.getAttribute("data-testid");
    const id = testId.replace("question-item-", "");
    return parseInt(id, 10);
  }

  async function deleteQuestion(page, id) {
    await page.click(`[data-testid="delete-question-${id}"]`);
    await page.click(".ant-popconfirm-buttons .ant-btn-primary");
    await expect(page.locator('.ant-message-success:has-text("Question deleted")')).toBeVisible();
  }

  async function editQuestion(page, id, newTitle) {
    await page.click(`[data-testid="edit-question-${id}"]`);
    await page.waitForURL(`**/question/${id}/edit`);

    await page.fill('[data-testid="question-title"]', newTitle);
    await page.click('[data-testid="submit-question"]');
    await page.waitForURL("**/questions");
    await expect(page.locator('.ant-message-success:has-text("Question updated")')).toBeVisible();
  }

  async function verifyQuestionDeletedViaApi(playwrightRequest, id) {
    const response = await playwrightRequest.get(
      `${API_BASE_URL}/question/${id}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    expect(response.status()).toBe(404);
  }

  test("Multiple Choice question", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser);

    const { title } = await createQuestion(
      page,
      "multiple_choice",
      async (p) => {
        const options = ["Red", "Blue", "Green", "Yellow"];
        for (let i = 0; i < options.length; i++) {
          await p.fill(`[data-testid="mc-option-${i}-input"]`, options[i]);
        }
        await p.click(`[data-testid="mc-option-0-checkbox"]`);
        await p.click(`[data-testid="mc-option-2-checkbox"]`);
      },
    );

    const id = await findQuestionId(page, title);
    const editedTitle = `${title} EDITED`;
    await editQuestion(page, id, editedTitle);
    await expect(
      page.locator(`.ant-list-item:has-text("${editedTitle}")`),
    ).toBeVisible();
    await deleteQuestion(page, id);
    await verifyQuestionDeletedViaApi(request, id);
    await page.close();
  });

  test("True/False question", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser);

    const { title } = await createQuestion(page, "true_false", async (p) => {
      await p.click('[data-testid="true-false-true"]');
    });

    const id = await findQuestionId(page, title);
    await editQuestion(page, id, `${title} EDITED`);
    await deleteQuestion(page, id);
    await verifyQuestionDeletedViaApi(request, id);
    await page.close();
  });

  test("Fill Blank question", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser);

    const keyword = `apple_${Date.now()}`;
    const customTitle = `I like ${keyword} and banana`;

    await createQuestion(page, "fill_blank", async (p) => {
      await p.fill('[data-testid="fill-blank-keyword"]', keyword);
      await p.fill('[data-testid="question-title"]', customTitle);
      await expect(
        p.locator('[data-testid="fill-blank-preview"] .blank-placeholder'),
      ).toBeVisible();
    });

    const id = await findQuestionId(page, customTitle);
    await deleteQuestion(page, id);
    await verifyQuestionDeletedViaApi(request, id);
    await page.close();
  });

  test("Ordering question", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser);

    const { title } = await createQuestion(page, "ordering", async (p) => {
      const items = ["First", "Second", "Third"];
      for (let i = 0; i < items.length; i++) {
        await p.fill(`[data-testid="ordering-item-${i}"]`, items[i]);
      }
      await p.click('[data-testid="ordering-remove-3"]');
    });

    const id = await findQuestionId(page, title);
    await deleteQuestion(page, id);
    await verifyQuestionDeletedViaApi(request, id);
    await page.close();
  });

  test("Matching question", async ({ browser, request }) => {
    const page = await createAuthenticatedPage(browser);

    const { title } = await createQuestion(page, "matching", async (p) => {
      const pairs = [
        { left: "Cat", right: "Meow" },
        { left: "Dog", right: "Woof" },
      ];
      for (let i = 0; i < pairs.length; i++) {
        await p.fill(`[data-testid="matching-left-${i}"]`, pairs[i].left);
        await p.fill(`[data-testid="matching-right-${i}"]`, pairs[i].right);
      }
      for (let i = 3; i >= 2; i--) {
        await p.click(`[data-testid="matching-remove-${i}"]`);
      }
    });

    const id = await findQuestionId(page, title);
    await deleteQuestion(page, id);
    await verifyQuestionDeletedViaApi(request, id);
    await page.close();
  });
});