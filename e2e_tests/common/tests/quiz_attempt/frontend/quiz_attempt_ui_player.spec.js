// tests/quiz_attempt/quiz_attempt_ui_player.spec.js
// UI tests for the QuizPlayer page (question navigation, auto-save, submit flow).
// Uses the data-testid attributes added to the Vue components.

import { test, expect } from "@playwright/test";
import {
  APP_BASE_URL,
  AUTH_STORAGE_KEY,
  ALL_QUESTION_TYPES,
  SCORED_TYPES,
  loginAsAdmin,
  authHeaders,
  createQuizWithQuestions,
  startAttempt,
  deleteQuiz,
  fullSetup,
  fullTeardown,
} from "./helpers/quiz_attempt.helpers.js";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates an authenticated page and navigates to the QuizPlayer.
 * Uses a fresh browser context (same pattern as quiz-test-utils createAuthenticatedPage)
 * so addInitScript fires cleanly before the very first navigation.
 */
async function createPlayerPage(browser, token, quizId, attemptId) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: AUTH_STORAGE_KEY, value: token },
  );
  await page.goto(`${APP_BASE_URL}/quiz/${quizId}/attempt/${attemptId}`);
  await page.waitForSelector('[data-testid="player-container"]', {
    timeout: 15_000,
  });
  return { page, context };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

test.describe("QuizPlayer UI", () => {
  // ── Layout & initial state ─────────────────────────────────────────────────

  test("P-1: player renders progress indicator on first question", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      const progress = page.locator('[data-testid="player-progress"]');
      await expect(progress).toBeVisible();
      await expect(progress).toContainText("Question 1");
      await expect(progress).toContainText(String(ALL_QUESTION_TYPES.length));
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-2: first question content is displayed", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await expect(
        page.locator('[data-testid="question-content"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="question-content"]'),
      ).not.toBeEmpty();
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-3: previous button is disabled on the first question", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await expect(
        page.locator('[data-testid="prev-question"]'),
      ).toBeDisabled();
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-4: next button is visible (not on last question initially)", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await expect(page.locator('[data-testid="next-question"]')).toBeVisible();
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test("P-5: clicking Next advances to question 2", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await page.click('[data-testid="next-question"]');
      await expect(
        page.locator('[data-testid="player-progress"]'),
      ).toContainText("Question 2");
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-6: clicking Next then Previous returns to question 1", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await page.click('[data-testid="next-question"]');
      await page.click('[data-testid="prev-question"]');
      await expect(
        page.locator('[data-testid="player-progress"]'),
      ).toContainText("Question 1");
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-7: navigating to last question shows Submit button instead of Next", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      for (let i = 1; i < ALL_QUESTION_TYPES.length; i++) {
        await page.click('[data-testid="next-question"]');
      }
      await expect(
        page.locator('[data-testid="submit-attempt"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="next-question"]'),
      ).not.toBeVisible();
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-8: submit button is disabled when not all questions are answered", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      for (let i = 1; i < ALL_QUESTION_TYPES.length; i++) {
        await page.click('[data-testid="next-question"]');
      }
      await expect(
        page.locator('[data-testid="submit-attempt"]'),
      ).toBeDisabled();
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  // ── Sidebar ────────────────────────────────────────────────────────────────

  test("P-9: sidebar opens when menu button is clicked", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await page.click('[data-testid="open-sidebar"]');
      await expect(
        page.locator('[data-testid="question-sidebar"]'),
      ).toBeVisible();
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-10: sidebar shows correct number of question buttons", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await page.click('[data-testid="open-sidebar"]');
      await expect(
        page.locator('[data-testid^="sidebar-question-"]'),
      ).toHaveCount(ALL_QUESTION_TYPES.length);
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-11: clicking sidebar question 5 jumps to question 5", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await page.click('[data-testid="open-sidebar"]');
      await page.click('[data-testid="sidebar-question-4"]');
      await expect(
        page.locator('[data-testid="player-progress"]'),
      ).toContainText("Question 5");
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  // ── Auto-save indicator ────────────────────────────────────────────────────

  test("P-12: auto-save indicator is visible", async ({ browser, request }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await expect(
        page.locator('[data-testid="auto-save-indicator"]'),
      ).toBeVisible();
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  test("P-13: auto-save label shows Saved when idle", async ({
    browser,
    request,
  }) => {
    const { token, quizId, attemptId } = await fullSetup(request);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      attemptId,
    );
    try {
      await expect(page.locator('[data-testid="auto-save-label"]')).toHaveText(
        "Saved",
      );
    } finally {
      await page.close();
      await context.close();
      await fullTeardown(request, token, quizId);
    }
  });

  // ── Submit modal ───────────────────────────────────────────────────────────

  test("P-14: submit modal appears after all questions answered", async ({
    browser,
    request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(
      request,
      token,
      ["true_false"],
      "Submit",
    );
    const startData = await startAttempt(request, token, quizId);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      startData.attemptId,
    );
    try {
      await page.click('[data-testid="true-false-option-true"]');
      await page.waitForTimeout(1200);
      await expect(page.locator('[data-testid="submit-attempt"]')).toBeEnabled({
        timeout: 5_000,
      });
      await page.click('[data-testid="submit-attempt"]');
      await expect(page.locator('[data-testid="submit-modal"]')).toBeVisible();
    } finally {
      await page.close();
      await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("P-15: cancelling submit modal keeps player open", async ({
    browser,
    request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(
      request,
      token,
      ["true_false"],
      "Cancel",
    );
    const startData = await startAttempt(request, token, quizId);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      startData.attemptId,
    );
    try {
      await page.click('[data-testid="true-false-option-true"]');
      await page.waitForTimeout(1200);
      await page.click('[data-testid="submit-attempt"]');
      await page.click(
        '[data-testid="submit-modal"] >> button:has-text("Cancel")',
      );
      await expect(
        page.locator('[data-testid="player-container"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="submit-modal"]'),
      ).not.toBeVisible();
    } finally {
      await page.close();
      await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  test("P-16: confirming submit navigates to review page", async ({
    browser,
    request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(
      request,
      token,
      ["true_false"],
      "ConfirmSubmit",
    );
    const startData = await startAttempt(request, token, quizId);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      startData.attemptId,
    );
    try {
      await page.click('[data-testid="true-false-option-true"]');
      await page.waitForTimeout(1200);
      await page.click('[data-testid="submit-attempt"]');
      await page.click(
        '[data-testid="submit-modal"] >> button:has-text("Yes, submit")',
      );
      await page.waitForURL(/\/review/, { timeout: 10_000 });
      await expect(
        page.locator('[data-testid="review-container"]'),
      ).toBeVisible();
    } finally {
      await page.close();
      await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── Answered-count indicator ───────────────────────────────────────────────

  test("P-17: answered count updates after answering a question", async ({
    browser,
    request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(
      request,
      token,
      ["true_false", "true_false"],
      "Count",
    );
    const startData = await startAttempt(request, token, quizId);
    const { page, context } = await createPlayerPage(
      browser,
      token,
      quizId,
      startData.attemptId,
    );
    try {
      await page.click('[data-testid="next-question"]');
      await expect(
        page.locator('[data-testid="answered-count"]'),
      ).toContainText("0/2");
      await page.click('[data-testid="true-false-option-true"]');
      await page.waitForTimeout(200);
      await expect(
        page.locator('[data-testid="answered-count"]'),
      ).toContainText("1/2");
    } finally {
      await page.close();
      await context.close();
      await deleteQuiz(request, token, quizId);
    }
  });

  // ── Question type rendering ────────────────────────────────────────────────

  const typeTestData = [
    { type: "multiple_choice", testid: "multiple-choice-group" },
    { type: "single_choice", testid: "single-choice-group" },
    { type: "true_false", testid: "true-false-group" },
    { type: "fill_blank", testid: "fill-blank-input" },
    { type: "ordering", testid: "ordering-container" },
    { type: "matching", testid: "matching-container" },
    { type: "flashcard", testid: "flashcard-container" },
  ];

  for (const { type, testid } of typeTestData) {
    test(`P-18-${type}: correct question component renders for type "${type}"`, async ({
      browser,
      request,
    }) => {
      const token = await loginAsAdmin(request);
      const { quizId } = await createQuizWithQuestions(
        request,
        token,
        [type],
        type,
      );
      const startData = await startAttempt(request, token, quizId);
      const { page, context } = await createPlayerPage(
        browser,
        token,
        quizId,
        startData.attemptId,
      );
      try {
        await expect(page.locator(`[data-testid="${testid}"]`)).toBeVisible();
      } finally {
        await page.close();
        await context.close();
        await deleteQuiz(request, token, quizId);
      }
    });
  }
});

// ── Layout & initial state ─────────────────────────────────────────────────

test("P-1: player renders progress indicator on first question", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    const progress = page.locator('[data-testid="player-progress"]');
    await expect(progress).toBeVisible();
    await expect(progress).toContainText("Question 1");
    await expect(progress).toContainText(String(ALL_QUESTION_TYPES.length));
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-2: first question content is displayed", async ({ page, request }) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await expect(
      page.locator('[data-testid="question-content"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="question-content"]'),
    ).not.toBeEmpty();
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-3: previous button is disabled on the first question", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await expect(page.locator('[data-testid="prev-question"]')).toBeDisabled();
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-4: next button is visible (not on last question initially)", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await expect(page.locator('[data-testid="next-question"]')).toBeVisible();
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

// ── Navigation ─────────────────────────────────────────────────────────────

test("P-5: clicking Next advances to question 2", async ({ page, request }) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await page.click('[data-testid="next-question"]');
    await expect(page.locator('[data-testid="player-progress"]')).toContainText(
      "Question 2",
    );
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-6: clicking Next then Previous returns to question 1", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await page.click('[data-testid="next-question"]');
    await page.click('[data-testid="prev-question"]');
    await expect(page.locator('[data-testid="player-progress"]')).toContainText(
      "Question 1",
    );
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-7: navigating to last question shows Submit button instead of Next", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);
  const totalQuestions = ALL_QUESTION_TYPES.length;

  try {
    await goToPlayer(page, quizId, attemptId);
    for (let i = 1; i < totalQuestions; i++) {
      await page.click('[data-testid="next-question"]');
    }
    await expect(page.locator('[data-testid="submit-attempt"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="next-question"]'),
    ).not.toBeVisible();
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-8: submit button is disabled when not all questions are answered", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);
  const totalQuestions = ALL_QUESTION_TYPES.length;

  try {
    await goToPlayer(page, quizId, attemptId);
    for (let i = 1; i < totalQuestions; i++) {
      await page.click('[data-testid="next-question"]');
    }
    await expect(page.locator('[data-testid="submit-attempt"]')).toBeDisabled();
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

// ── Sidebar ────────────────────────────────────────────────────────────────

test("P-9: sidebar opens when menu button is clicked", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await page.click('[data-testid="open-sidebar"]');
    await expect(
      page.locator('[data-testid="question-sidebar"]'),
    ).toBeVisible();
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-10: sidebar shows correct number of question buttons", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await page.click('[data-testid="open-sidebar"]');
    const buttons = page.locator('[data-testid^="sidebar-question-"]');
    await expect(buttons).toHaveCount(ALL_QUESTION_TYPES.length);
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-11: clicking sidebar question 5 jumps to question 5", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await page.click('[data-testid="open-sidebar"]');
    await page.click('[data-testid="sidebar-question-4"]'); // 0-indexed = question 5
    await expect(page.locator('[data-testid="player-progress"]')).toContainText(
      "Question 5",
    );
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

// ── Auto-save indicator ────────────────────────────────────────────────────

test("P-12: auto-save indicator is visible", async ({ page, request }) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await expect(
      page.locator('[data-testid="auto-save-indicator"]'),
    ).toBeVisible();
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

test("P-13: auto-save label shows Saved when idle", async ({
  page,
  request,
}) => {
  const { token, quizId, attemptId } = await fullSetup(request);

  try {
    await goToPlayer(page, quizId, attemptId);
    await expect(page.locator('[data-testid="auto-save-label"]')).toHaveText(
      "Saved",
    );
  } finally {
    await fullTeardown(request, token, quizId);
  }
});

// ── Submit modal ───────────────────────────────────────────────────────────

test("P-14: submit modal appears when submit button is clicked (after all answered)", async ({
  page,
  request,
}) => {
  // Use a single-question quiz so it's easier to answer everything
  const token = await loginAsAdmin(request);
  const { quizId, questionIds } = await createQuizWithQuestions(
    request,
    token,
    ["true_false"],
    "Submit",
  );
  const startData = await startAttempt(request, token, quizId);
  const attemptId = startData.attemptId;

  try {
    await goToPlayer(page, quizId, attemptId);
    // Answer the true/false question
    await page.click('[data-testid="true-false-option-true"]');
    await page.waitForTimeout(1200); // wait for debounce

    // Now submit button should be enabled
    await expect(page.locator('[data-testid="submit-attempt"]')).toBeEnabled({
      timeout: 5000,
    });
    await page.click('[data-testid="submit-attempt"]');
    await expect(page.locator('[data-testid="submit-modal"]')).toBeVisible();
  } finally {
    await deleteQuiz(request, token, quizId);
  }
});

test("P-15: cancelling submit modal keeps player open", async ({
  page,
  request,
}) => {
  const token = await loginAsAdmin(request);
  const { quizId } = await createQuizWithQuestions(
    request,
    token,
    ["true_false"],
    "Cancel",
  );
  const startData = await startAttempt(request, token, quizId);
  const attemptId = startData.attemptId;

  try {
    await goToPlayer(page, quizId, attemptId);
    await page.click('[data-testid="true-false-option-true"]');
    await page.waitForTimeout(1200);
    await page.click('[data-testid="submit-attempt"]');
    await page.click(
      '[data-testid="submit-modal"] >> button:has-text("Cancel")',
    );
    await expect(
      page.locator('[data-testid="player-container"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="submit-modal"]'),
    ).not.toBeVisible();
  } finally {
    await deleteQuiz(request, token, quizId);
  }
});

test("P-16: confirming submit navigates to review page", async ({
  page,
  request,
}) => {
  const token = await loginAsAdmin(request);
  const { quizId } = await createQuizWithQuestions(
    request,
    token,
    ["true_false"],
    "ConfirmSubmit",
  );
  const startData = await startAttempt(request, token, quizId);
  const attemptId = startData.attemptId;

  try {
    await goToPlayer(page, quizId, attemptId);
    await page.click('[data-testid="true-false-option-true"]');
    await page.waitForTimeout(1200);
    await page.click('[data-testid="submit-attempt"]');
    await page.click(
      '[data-testid="submit-modal"] >> button:has-text("Yes, submit")',
    );
    await page.waitForURL(/\/review/, { timeout: 10_000 });
    await expect(
      page.locator('[data-testid="review-container"]'),
    ).toBeVisible();
  } finally {
    await deleteQuiz(request, token, quizId);
  }
});

// ── Answered-count indicator ───────────────────────────────────────────────

test("P-17: answered count updates after answering a question", async ({
  page,
  request,
}) => {
  const token = await loginAsAdmin(request);
  const { quizId } = await createQuizWithQuestions(
    request,
    token,
    ["true_false", "true_false"],
    "Count",
  );
  const startData = await startAttempt(request, token, quizId);
  const attemptId = startData.attemptId;

  try {
    await goToPlayer(page, quizId, attemptId);
    // Navigate to last question to see answered count
    await page.click('[data-testid="next-question"]');
    await expect(page.locator('[data-testid="answered-count"]')).toContainText(
      "0/2",
    );
    await page.click('[data-testid="true-false-option-true"]');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-testid="answered-count"]')).toContainText(
      "1/2",
    );
  } finally {
    await deleteQuiz(request, token, quizId);
  }
});

// ── Question type rendering ────────────────────────────────────────────────

const typeTestData = [
  { type: "multiple_choice", testid: "multiple-choice-group" },
  { type: "single_choice", testid: "single-choice-group" },
  { type: "true_false", testid: "true-false-group" },
  { type: "fill_blank", testid: "fill-blank-input" },
  { type: "ordering", testid: "ordering-container" },
  { type: "matching", testid: "matching-container" },
  { type: "flashcard", testid: "flashcard-container" },
];

for (const { type, testid } of typeTestData) {
  test(`P-18-${type}: correct question component renders for type "${type}"`, async ({
    page,
    request,
  }) => {
    const token = await loginAsAdmin(request);
    const { quizId } = await createQuizWithQuestions(
      request,
      token,
      [type],
      type,
    );
    const startData = await startAttempt(request, token, quizId);

    try {
      await goToPlayer(page, quizId, startData.attemptId);
      await expect(page.locator(`[data-testid="${testid}"]`)).toBeVisible();
    } finally {
      await deleteQuiz(request, token, quizId);
    }
  });
}
