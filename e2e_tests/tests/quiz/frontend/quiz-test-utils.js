import { expect } from "@playwright/test";

export const FRONTEND_URL = "http://localhost:4000";
export const API_BASE_URL = "http://localhost:3001/api";
export const adminUser = { username: "admin", password: "123" };

export function generateUniqueName(base) {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return `${base} ${id}`;
}

export async function loginAsAdmin(request) {
  const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      username: adminUser.username,
      password: adminUser.password,
    },
  });
  expect(loginRes.status()).toBe(200);
  const loginBody = await loginRes.json();
  return loginBody.token;
}

export async function createAuthenticatedPage(browser, token) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript((t) => {
    localStorage.setItem("session_token", t);
  }, token);
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page.locator('[data-testid="tab-my-quizzes"]')).toBeVisible({
    timeout: 10000,
  });
  return page;
}

export async function createQuiz(page, customTitle = null) {
  const title = customTitle || generateUniqueName("Quiz");
  const description = `Description for ${title}`;

  await page.goto(`${FRONTEND_URL}/quiz/new`);
  await page.fill('[data-testid="quiz-title-input"]', title);
  await page.fill('[data-testid="quiz-description-input"]', description);
  await page.locator('[data-testid="quiz-tags-select"] input').fill("e2e");
  await page.locator('[data-testid="quiz-tags-select"] input').press("Enter");
  await page.keyboard.press("Escape");

  await page.click('[data-testid="quiz-submit-button"]');
  await page.waitForURL(/\/quiz\/\d+$/);
  const url = page.url();
  const id = parseInt(url.split("/").pop(), 10);
  return { id, title };
}

// FIXED: Use X-Session-Token header instead of Authorization Bearer
export async function deleteQuizViaApi(request, token, id) {
  const response = await request.delete(`${API_BASE_URL}/quiz/${id}`, {
    headers: { "X-Session-Token": token },
  });
  expect([200, 204]).toContain(response.status()); // Playwright APIResponse uses status() method
}

// FIXED: Use X-Session-Token header
export async function createSourceViaApi(token) {
  const title = generateUniqueName('Source');
  const content = 'Test source content';
  const response = await fetch(`${API_BASE_URL}/source/note`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': token,
    },
    body: JSON.stringify({
      title,
      content,
    }),
  });
  expect(response.status).toBe(201);
  const source = await response.json();
  return source;
}

// FIXED: Use X-Session-Token header
export async function deleteSourceViaApi(token, id) {
  const response = await fetch(`${API_BASE_URL}/source/${id}`, {
    method: "DELETE",
    headers: { "X-Session-Token": token },
  });
  expect([200, 204]).toContain(response.status); // fetch Response uses status property
}

export async function addQuestionToQuiz(
  page,
  questionType = "multiple_choice",
) {
  await page.click('[data-testid="add-question-button"]');

  // Wait for modal content to appear
  await page.waitForSelector(".ant-modal-content", {
    state: "visible",
    timeout: 10000,
  });
  await page.waitForTimeout(300); // brief pause for form rendering
  await expect(page.locator('[data-testid="question-title"]')).toBeVisible({
    timeout: 5000,
  });

  const questionTitle = generateUniqueName(questionType);
  await page.fill('[data-testid="question-title"]', questionTitle);
  await page.fill(
    '[data-testid="question-description"]',
    `Description for ${questionType}`,
  );

  // Select question type
  await page.click('[data-testid="question-type"]');
  await page.waitForSelector(
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
  );
  const typeLabel = {
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    fill_blank: "Fill Blank",
    ordering: "Ordering",
    matching: "Matching",
  }[questionType];
  await page.click(
    `.ant-select-dropdown .ant-select-item-option:has-text("${typeLabel}")`,
  );
  try {
    await page.waitForSelector(".ant-select-dropdown", {
      state: "hidden",
      timeout: 2000,
    });
  } catch {
    await page.keyboard.press("Escape");
  }

  // Fill type-specific fields
  if (questionType === "multiple_choice") {
    const options = ["Option A", "Option B", "Option C", "Option D"];
    for (let i = 0; i < options.length; i++) {
      await page.fill(`[data-testid="mc-option-${i}-input"]`, options[i]);
    }
    await page.click('[data-testid="mc-option-0-checkbox"]');
    await page.click('[data-testid="mc-option-2-checkbox"]');
  } else if (questionType === "true_false") {
    await page.click('[data-testid="true-false-true"]');
  } else if (questionType === "fill_blank") {
    const keyword = `keyword_${Date.now()}`;
    await page.fill('[data-testid="fill-blank-keyword"]', keyword);
  } else if (questionType === "ordering") {
    const items = ["First", "Second", "Third", "Fourth"];
    for (let i = 0; i < items.length; i++) {
      await page.fill(`[data-testid="ordering-item-${i}"]`, items[i]);
    }
  } else if (questionType === "matching") {
    const pairs = [
      { left: "Cat", right: "Meow" },
      { left: "Dog", right: "Woof" },
      { left: "Cow", right: "Moo" },
      { left: "Sheep", right: "Baa" },
    ];
    for (let i = 0; i < pairs.length; i++) {
      await page.fill(`[data-testid="matching-left-${i}"]`, pairs[i].left);
      await page.fill(`[data-testid="matching-right-${i}"]`, pairs[i].right);
    }
  }

  // Add a tag – pressing Enter usually closes the dropdown automatically
  await page.locator('[data-testid="question-tags"] input').fill("e2e");
  await page.locator('[data-testid="question-tags"] input').press("Enter");
  // Wait for tag to appear, then close the dropdown by clicking on the modal title
  await page.waitForTimeout(200);
  // Click on the modal title to close the dropdown (safe, doesn't close modal)
  await page.click(".ant-modal-header");
  // Ensure dropdown is hidden
  await page.waitForSelector(".ant-select-dropdown", {
    state: "hidden",
    timeout: 2000,
  }).catch(() => {});

  // Ensure submit button is enabled
  await expect(page.locator('[data-testid="submit-question"]')).toBeEnabled({
    timeout: 5000,
  });

  // Click submit
  await page.click('[data-testid="submit-question"]');

  // Wait for either modal to close or an error message to appear
  try {
    const result = await Promise.race([
      page
        .waitForSelector(".ant-modal-content", {
          state: "hidden",
          timeout: 15000,
        })
        .then(() => "hidden"),
      page
        .waitForSelector(".ant-message-error, .ant-message-warning", {
          state: "visible",
          timeout: 15000,
        })
        .then(async (el) => {
          const messageType = await el.getAttribute("class");
          const messageText = await el.textContent();
          throw new Error(
            `Form submission failed: ${messageType} - ${messageText}`,
          );
        }),
    ]);

    if (result !== "hidden") {
      throw new Error("Unexpected race condition");
    }
  } catch (error) {
    // Take a screenshot for debugging
    await page.screenshot({
      path: `question-submit-failure-${questionType}.png`,
    });
    // Log a snippet of the page content
    const html = await page.content();
    console.error(
      `Page content after submit failure for ${questionType}:`,
      html.substring(0, 1000),
    );
    throw error;
  }

  // Verify question appears in the list
  await expect(
    page.locator(`.font-medium:has-text("${questionTitle}")`),
  ).toBeVisible({ timeout: 10000 });
  return questionTitle;
}
