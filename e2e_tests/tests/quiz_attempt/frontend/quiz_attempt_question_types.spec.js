// tests/quiz_attempt/quiz_attempt_question_types.spec.js
// UI interaction tests for every question-type component inside QuizPlayer.
// Pattern: create single-question quiz → open player → interact → assert saved state.
//
// Auth pattern mirrors quiz-test-utils.js createAuthenticatedPage:
//   create new browser context → addInitScript(session_token) → goto player URL
// This avoids any dependency on login-form testids and works reliably across
// page navigations because addInitScript runs on every document load in the context.

import { test, expect } from "@playwright/test";
import {
  APP_BASE_URL,
  AUTH_STORAGE_KEY,
  loginAsAdmin,
  createQuizWithQuestions,
  startAttempt,
  deleteQuiz,
} from "./helpers/quiz_attempt.helpers.js";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a fresh authenticated browser context, starts an attempt for a single
 * question type, navigates to the player, and returns everything needed.
 *
 * Uses a new context per test (same as createAuthenticatedPage in quiz-test-utils)
 * so addInitScript fires cleanly before the very first navigation.
 */
async function setupSingleTypePlayer(browser, request, type) {
  const token = await loginAsAdmin(request);
  const { quizId, questionIds } = await createQuizWithQuestions(
    request,
    token,
    [type],
    type,
  );
  const startData = await startAttempt(request, token, quizId);
  const attemptId = startData.attemptId;

  // Fresh context — addInitScript runs before any navigation in this context
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

  return {
    page,
    context,
    token,
    quizId,
    questionIds,
    attemptId,
    cleanup: async () => {
      await page.close();
      await context.close();
      await deleteQuiz(request, token, quizId);
    },
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

// No beforeEach needed — each test creates its own authenticated context
// via setupSingleTypePlayer, which is cleaner and avoids shared state.

test.describe("Question Type UI Interactions", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TRUE / FALSE
  // ─────────────────────────────────────────────────────────────────────────

  test("QT-TF-1: true/false renders both True and False radio options", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "true_false",
    );
    try {
      await expect(
        page.locator('[data-testid="true-false-option-true"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="true-false-option-false"]'),
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("QT-TF-2: clicking True selects it", async ({ browser, request }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "true_false",
    );
    try {
      await page.click('[data-testid="true-false-option-true"]');
      await expect(
        page.locator(
          '[data-testid="true-false-option-true"] input[type="radio"]',
        ),
      ).toBeChecked();
    } finally {
      await cleanup();
    }
  });

  test("QT-TF-3: clicking False selects it and deselects True", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "true_false",
    );
    try {
      await page.click('[data-testid="true-false-option-true"]');
      await page.click('[data-testid="true-false-option-false"]');
      await expect(
        page.locator(
          '[data-testid="true-false-option-false"] input[type="radio"]',
        ),
      ).toBeChecked();
      await expect(
        page.locator(
          '[data-testid="true-false-option-true"] input[type="radio"]',
        ),
      ).not.toBeChecked();
    } finally {
      await cleanup();
    }
  });

  test("QT-TF-4: answering true/false enables the submit button", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "true_false",
    );
    try {
      await expect(
        page.locator('[data-testid="submit-attempt"]'),
      ).toBeDisabled();
      await page.click('[data-testid="true-false-option-true"]');
      await page.waitForTimeout(200);
      await expect(page.locator('[data-testid="submit-attempt"]')).toBeEnabled({
        timeout: 5_000,
      });
    } finally {
      await cleanup();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SINGLE CHOICE
  // ─────────────────────────────────────────────────────────────────────────

  test("QT-SC-1: single choice renders all options", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "single_choice",
    );
    try {
      await expect(
        page.locator('[data-testid="single-choice-group"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid^="single-choice-option-"]'),
      ).toHaveCount(2);
    } finally {
      await cleanup();
    }
  });

  test("QT-SC-2: selecting an option marks it as checked", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "single_choice",
    );
    try {
      await page.click('[data-testid="single-choice-option-0"]');
      await expect(
        page.locator(
          '[data-testid="single-choice-option-0"] input[type="radio"]',
        ),
      ).toBeChecked();
    } finally {
      await cleanup();
    }
  });

  test("QT-SC-3: selecting a different option deselects the previous one", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "single_choice",
    );
    try {
      await page.click('[data-testid="single-choice-option-0"]');
      await page.click('[data-testid="single-choice-option-1"]');
      await expect(
        page.locator(
          '[data-testid="single-choice-option-1"] input[type="radio"]',
        ),
      ).toBeChecked();
      await expect(
        page.locator(
          '[data-testid="single-choice-option-0"] input[type="radio"]',
        ),
      ).not.toBeChecked();
    } finally {
      await cleanup();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MULTIPLE CHOICE
  // ─────────────────────────────────────────────────────────────────────────

  test("QT-MC-1: multiple choice renders all options as checkboxes", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "multiple_choice",
    );
    try {
      await expect(
        page.locator('[data-testid="multiple-choice-group"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid^="multiple-choice-option-"]'),
      ).toHaveCount(3);
    } finally {
      await cleanup();
    }
  });

  test("QT-MC-2: can check multiple options simultaneously", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "multiple_choice",
    );
    try {
      await page.click('[data-testid="multiple-choice-option-0"]');
      await page.click('[data-testid="multiple-choice-option-2"]');
      await expect(
        page.locator(
          '[data-testid="multiple-choice-option-0"] input[type="checkbox"]',
        ),
      ).toBeChecked();
      await expect(
        page.locator(
          '[data-testid="multiple-choice-option-2"] input[type="checkbox"]',
        ),
      ).toBeChecked();
    } finally {
      await cleanup();
    }
  });

  test("QT-MC-3: unchecking an already-checked option deselects it", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "multiple_choice",
    );
    try {
      await page.click('[data-testid="multiple-choice-option-0"]');
      await page.click('[data-testid="multiple-choice-option-0"]');
      await expect(
        page.locator(
          '[data-testid="multiple-choice-option-0"] input[type="checkbox"]',
        ),
      ).not.toBeChecked();
    } finally {
      await cleanup();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FILL BLANK
  // ─────────────────────────────────────────────────────────────────────────

  test("QT-FB-1: fill blank renders a text input", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "fill_blank",
    );
    try {
      await expect(
        page.locator('[data-testid="fill-blank-input"]'),
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("QT-FB-2: question content replaces keyword with ___", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "fill_blank",
    );
    try {
      await expect(
        page.locator('[data-testid="question-content"]'),
      ).toContainText("___");
    } finally {
      await cleanup();
    }
  });

  test("QT-FB-3: typing in fill blank input updates the value", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "fill_blank",
    );
    try {
      await page.fill('[data-testid="fill-blank-input"]', "my answer");
      await expect(
        page.locator('[data-testid="fill-blank-input"]'),
      ).toHaveValue("my answer");
    } finally {
      await cleanup();
    }
  });

  test("QT-FB-4: clearing fill blank input removes the value", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "fill_blank",
    );
    try {
      await page.fill('[data-testid="fill-blank-input"]', "some text");
      await page.fill('[data-testid="fill-blank-input"]', "");
      await expect(
        page.locator('[data-testid="fill-blank-input"]'),
      ).toHaveValue("");
    } finally {
      await cleanup();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FLASHCARD
  // ─────────────────────────────────────────────────────────────────────────

  test("QT-FC-1: flashcard shows front content", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "flashcard",
    );
    try {
      await expect(
        page.locator('[data-testid="flashcard-front-content"]'),
      ).toContainText("Front of flashcard");
    } finally {
      await cleanup();
    }
  });

  test("QT-FC-2: flashcard shows informational message (not scored)", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "flashcard",
    );
    try {
      await expect(
        page.locator('[data-testid="flashcard-info"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="flashcard-info"]'),
      ).toContainText("not scored");
    } finally {
      await cleanup();
    }
  });

  test("QT-FC-3: flashcard submit button is enabled immediately (no answer required)", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "flashcard",
    );
    try {
      await expect(page.locator('[data-testid="submit-attempt"]')).toBeEnabled({
        timeout: 3_000,
      });
    } finally {
      await cleanup();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ORDERING
  // ─────────────────────────────────────────────────────────────────────────

  test("QT-OR-1: ordering renders all draggable items", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "ordering",
    );
    try {
      await expect(
        page.locator('[data-testid="ordering-container"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid^="ordering-item-"]')).toHaveCount(
        3,
      );
    } finally {
      await cleanup();
    }
  });

  test("QT-OR-2: ordering items show position numbers", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "ordering",
    );
    try {
      await expect(
        page.locator('[data-testid="ordering-item-position-1"]'),
      ).toContainText("1");
      await expect(
        page.locator('[data-testid="ordering-item-position-2"]'),
      ).toContainText("2");
    } finally {
      await cleanup();
    }
  });

  test("QT-OR-3: ordering drag handles are visible", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "ordering",
    );
    try {
      await expect(
        page.locator('[data-testid="ordering-drag-handle-1"]'),
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MATCHING
  // ─────────────────────────────────────────────────────────────────────────

  test("QT-MA-1: matching renders left and right columns", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await expect(
        page.locator('[data-testid="matching-left-column"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="matching-right-column"]'),
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("QT-MA-2: matching shows correct number of items in each column", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await expect(page.locator('[data-testid^="matching-left-"]')).toHaveCount(
        2,
      );
      await expect(
        page.locator('[data-testid^="matching-right-"]'),
      ).toHaveCount(2);
    } finally {
      await cleanup();
    }
  });

  test("QT-MA-3: clicking a left item selects it (highlighted)", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await page.click('[data-testid="matching-left-1"]');
      await expect(page.locator('[data-testid="matching-left-1"]')).toHaveClass(
        /border-indigo-500/,
      );
    } finally {
      await cleanup();
    }
  });

  test("QT-MA-4: clicking a left then right item creates a match", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await page.click('[data-testid="matching-left-1"]');
      await page.click('[data-testid="matching-right-1"]');
      await expect(
        page.locator('[data-testid="matching-progress"]'),
      ).toContainText("1 / 2");
    } finally {
      await cleanup();
    }
  });

  test("QT-MA-5: matched left item shows green border", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await page.click('[data-testid="matching-left-1"]');
      await page.click('[data-testid="matching-right-1"]');
      await expect(page.locator('[data-testid="matching-left-1"]')).toHaveClass(
        /border-green-500/,
      );
    } finally {
      await cleanup();
    }
  });

  test("QT-MA-6: matching all pairs shows completion message", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await page.click('[data-testid="matching-left-1"]');
      await page.click('[data-testid="matching-right-1"]');
      await page.click('[data-testid="matching-left-2"]');
      await page.click('[data-testid="matching-right-2"]');
      await expect(
        page.locator('[data-testid="matching-complete"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="matching-complete"]'),
      ).toContainText("All pairs matched");
    } finally {
      await cleanup();
    }
  });

  test("QT-MA-7: reset button clears all matches", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await page.click('[data-testid="matching-left-1"]');
      await page.click('[data-testid="matching-right-1"]');
      await page.click('[data-testid="matching-reset"]');
      await expect(
        page.locator('[data-testid="matching-progress"]'),
      ).toContainText("0 / 2");
    } finally {
      await cleanup();
    }
  });

  test("QT-MA-8: reset button is disabled when no matches exist", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await expect(
        page.locator('[data-testid="matching-reset"]'),
      ).toBeDisabled();
    } finally {
      await cleanup();
    }
  });

  test("QT-MA-9: clicking the same left item twice deselects it", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "matching",
    );
    try {
      await page.click('[data-testid="matching-left-1"]');
      await page.click('[data-testid="matching-left-1"]');
      await expect(
        page.locator('[data-testid="matching-left-1"]'),
      ).not.toHaveClass(/border-indigo-500/);
    } finally {
      await cleanup();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-save triggers
  // ─────────────────────────────────────────────────────────────────────────

  test("QT-AS-1: auto-save label settles on Saved after answering true/false", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "true_false",
    );
    try {
      await page.click('[data-testid="true-false-option-true"]');
      await expect(page.locator('[data-testid="auto-save-label"]')).toHaveText(
        "Saved",
        {
          timeout: 5_000,
        },
      );
    } finally {
      await cleanup();
    }
  });

  test("QT-AS-2: auto-save triggers after fill-blank input", async ({
    browser,
    request,
  }) => {
    const { page, cleanup } = await setupSingleTypePlayer(
      browser,
      request,
      "fill_blank",
    );
    try {
      await page.fill('[data-testid="fill-blank-input"]', "typed answer");
      await expect(page.locator('[data-testid="auto-save-label"]')).toHaveText(
        "Saved",
        {
          timeout: 5_000,
        },
      );
    } finally {
      await cleanup();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TRUE / FALSE
// ─────────────────────────────────────────────────────────────────────────

test("QT-TF-1: true/false renders both True and False radio options", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "true_false");

  try {
    await expect(
      page.locator('[data-testid="true-false-option-true"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="true-false-option-false"]'),
    ).toBeVisible();
  } finally {
    await cleanup();
  }
});

test("QT-TF-2: clicking True selects it", async ({ page, request }) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "true_false");

  try {
    await page.click('[data-testid="true-false-option-true"]');
    const radio = page.locator(
      '[data-testid="true-false-option-true"] input[type="radio"]',
    );
    await expect(radio).toBeChecked();
  } finally {
    await cleanup();
  }
});

test("QT-TF-3: clicking False selects it and deselects True", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "true_false");

  try {
    await page.click('[data-testid="true-false-option-true"]');
    await page.click('[data-testid="true-false-option-false"]');
    const falseRadio = page.locator(
      '[data-testid="true-false-option-false"] input[type="radio"]',
    );
    const trueRadio = page.locator(
      '[data-testid="true-false-option-true"] input[type="radio"]',
    );
    await expect(falseRadio).toBeChecked();
    await expect(trueRadio).not.toBeChecked();
  } finally {
    await cleanup();
  }
});

test("QT-TF-4: answering true/false makes submit count increment", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "true_false");

  try {
    await expect(page.locator('[data-testid="submit-attempt"]')).toBeDisabled();
    await page.click('[data-testid="true-false-option-true"]');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-testid="submit-attempt"]')).toBeEnabled({
      timeout: 5_000,
    });
  } finally {
    await cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// SINGLE CHOICE
// ─────────────────────────────────────────────────────────────────────────

test("QT-SC-1: single choice renders all options", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(
    page,
    request,
    "single_choice",
  );

  try {
    await expect(
      page.locator('[data-testid="single-choice-group"]'),
    ).toBeVisible();
    const options = page.locator('[data-testid^="single-choice-option-"]');
    await expect(options).toHaveCount(2); // makeSnapshot creates 2 options
  } finally {
    await cleanup();
  }
});

test("QT-SC-2: selecting an option marks it as checked", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(
    page,
    request,
    "single_choice",
  );

  try {
    await page.click('[data-testid="single-choice-option-0"]');
    const radio = page.locator(
      '[data-testid="single-choice-option-0"] input[type="radio"]',
    );
    await expect(radio).toBeChecked();
  } finally {
    await cleanup();
  }
});

test("QT-SC-3: selecting a different option deselects the previous one", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(
    page,
    request,
    "single_choice",
  );

  try {
    await page.click('[data-testid="single-choice-option-0"]');
    await page.click('[data-testid="single-choice-option-1"]');
    const opt0 = page.locator(
      '[data-testid="single-choice-option-0"] input[type="radio"]',
    );
    const opt1 = page.locator(
      '[data-testid="single-choice-option-1"] input[type="radio"]',
    );
    await expect(opt1).toBeChecked();
    await expect(opt0).not.toBeChecked();
  } finally {
    await cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// MULTIPLE CHOICE
// ─────────────────────────────────────────────────────────────────────────

test("QT-MC-1: multiple choice renders all options as checkboxes", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(
    page,
    request,
    "multiple_choice",
  );

  try {
    await expect(
      page.locator('[data-testid="multiple-choice-group"]'),
    ).toBeVisible();
    const options = page.locator('[data-testid^="multiple-choice-option-"]');
    await expect(options).toHaveCount(3); // makeSnapshot creates 3 options
  } finally {
    await cleanup();
  }
});

test("QT-MC-2: can check multiple options simultaneously", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(
    page,
    request,
    "multiple_choice",
  );

  try {
    await page.click('[data-testid="multiple-choice-option-0"]');
    await page.click('[data-testid="multiple-choice-option-2"]');
    const cb0 = page.locator(
      '[data-testid="multiple-choice-option-0"] input[type="checkbox"]',
    );
    const cb2 = page.locator(
      '[data-testid="multiple-choice-option-2"] input[type="checkbox"]',
    );
    await expect(cb0).toBeChecked();
    await expect(cb2).toBeChecked();
  } finally {
    await cleanup();
  }
});

test("QT-MC-3: unchecking an already-checked option deselects it", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(
    page,
    request,
    "multiple_choice",
  );

  try {
    await page.click('[data-testid="multiple-choice-option-0"]');
    await page.click('[data-testid="multiple-choice-option-0"]'); // uncheck
    const cb0 = page.locator(
      '[data-testid="multiple-choice-option-0"] input[type="checkbox"]',
    );
    await expect(cb0).not.toBeChecked();
  } finally {
    await cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// FILL BLANK
// ─────────────────────────────────────────────────────────────────────────

test("QT-FB-1: fill blank renders a text input", async ({ page, request }) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "fill_blank");

  try {
    await expect(
      page.locator('[data-testid="fill-blank-input"]'),
    ).toBeVisible();
  } finally {
    await cleanup();
  }
});

test("QT-FB-2: question content replaces keyword with ___", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "fill_blank");

  try {
    const content = page.locator('[data-testid="question-content"]');
    await expect(content).toContainText("___");
  } finally {
    await cleanup();
  }
});

test("QT-FB-3: typing in fill blank input updates the value", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "fill_blank");

  try {
    await page.fill('[data-testid="fill-blank-input"]', "my answer");
    await expect(page.locator('[data-testid="fill-blank-input"]')).toHaveValue(
      "my answer",
    );
  } finally {
    await cleanup();
  }
});

test("QT-FB-4: clearing fill blank input removes the value", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "fill_blank");

  try {
    await page.fill('[data-testid="fill-blank-input"]', "some text");
    await page.fill('[data-testid="fill-blank-input"]', "");
    await expect(page.locator('[data-testid="fill-blank-input"]')).toHaveValue(
      "",
    );
  } finally {
    await cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// FLASHCARD
// ─────────────────────────────────────────────────────────────────────────

test("QT-FC-1: flashcard shows front content", async ({ page, request }) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "flashcard");

  try {
    await expect(
      page.locator('[data-testid="flashcard-front-content"]'),
    ).toContainText("Front of flashcard");
  } finally {
    await cleanup();
  }
});

test("QT-FC-2: flashcard shows informational message (not scored)", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "flashcard");

  try {
    await expect(page.locator('[data-testid="flashcard-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="flashcard-info"]')).toContainText(
      "not scored",
    );
  } finally {
    await cleanup();
  }
});

test("QT-FC-3: flashcard submit button is enabled immediately (no answer required)", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "flashcard");

  try {
    // Flashcard counts as answered → submit should be enabled
    await expect(page.locator('[data-testid="submit-attempt"]')).toBeEnabled({
      timeout: 3_000,
    });
  } finally {
    await cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// ORDERING
// ─────────────────────────────────────────────────────────────────────────

test("QT-OR-1: ordering renders all draggable items", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "ordering");

  try {
    await expect(
      page.locator('[data-testid="ordering-container"]'),
    ).toBeVisible();
    // makeSnapshot creates 3 items with order_id 1,2,3
    const items = page.locator('[data-testid^="ordering-item-"]');
    await expect(items).toHaveCount(3);
  } finally {
    await cleanup();
  }
});

test("QT-OR-2: ordering items show position numbers", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "ordering");

  try {
    await expect(
      page.locator('[data-testid="ordering-item-position-1"]'),
    ).toContainText("1");
    await expect(
      page.locator('[data-testid="ordering-item-position-2"]'),
    ).toContainText("2");
  } finally {
    await cleanup();
  }
});

test("QT-OR-3: ordering drag handles are visible", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "ordering");

  try {
    await expect(
      page.locator('[data-testid="ordering-drag-handle-1"]'),
    ).toBeVisible();
  } finally {
    await cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// MATCHING
// ─────────────────────────────────────────────────────────────────────────

test("QT-MA-1: matching renders left and right columns", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    await expect(
      page.locator('[data-testid="matching-left-column"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="matching-right-column"]'),
    ).toBeVisible();
  } finally {
    await cleanup();
  }
});

test("QT-MA-2: matching shows correct number of items in each column", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    // makeSnapshot creates 2 pairs
    const leftItems = page.locator('[data-testid^="matching-left-"]');
    const rightItems = page.locator('[data-testid^="matching-right-"]');
    await expect(leftItems).toHaveCount(2);
    await expect(rightItems).toHaveCount(2);
  } finally {
    await cleanup();
  }
});

test("QT-MA-3: clicking a left item selects it (highlighted)", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    await page.click('[data-testid="matching-left-1"]');
    const el = page.locator('[data-testid="matching-left-1"]');
    // The selected item gets border-indigo class
    await expect(el).toHaveClass(/border-indigo-500/);
  } finally {
    await cleanup();
  }
});

test("QT-MA-4: clicking a left then right item creates a match", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    await page.click('[data-testid="matching-left-1"]');
    await page.click('[data-testid="matching-right-1"]');
    // After match, progress should show 1 / 2
    await expect(
      page.locator('[data-testid="matching-progress"]'),
    ).toContainText("1 / 2");
  } finally {
    await cleanup();
  }
});

test("QT-MA-5: matched left item shows green checkmark", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    await page.click('[data-testid="matching-left-1"]');
    await page.click('[data-testid="matching-right-1"]');
    const leftEl = page.locator('[data-testid="matching-left-1"]');
    await expect(leftEl).toHaveClass(/border-green-500/);
  } finally {
    await cleanup();
  }
});

test("QT-MA-6: matching all pairs shows completion message", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    await page.click('[data-testid="matching-left-1"]');
    await page.click('[data-testid="matching-right-1"]');
    await page.click('[data-testid="matching-left-2"]');
    await page.click('[data-testid="matching-right-2"]');
    await expect(
      page.locator('[data-testid="matching-complete"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="matching-complete"]'),
    ).toContainText("All pairs matched");
  } finally {
    await cleanup();
  }
});

test("QT-MA-7: reset button clears all matches", async ({ page, request }) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    await page.click('[data-testid="matching-left-1"]');
    await page.click('[data-testid="matching-right-1"]');
    await page.click('[data-testid="matching-reset"]');
    await expect(
      page.locator('[data-testid="matching-progress"]'),
    ).toContainText("0 / 2");
  } finally {
    await cleanup();
  }
});

test("QT-MA-8: reset button is disabled when no matches exist", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    await expect(page.locator('[data-testid="matching-reset"]')).toBeDisabled();
  } finally {
    await cleanup();
  }
});

test("QT-MA-9: clicking the same left item twice deselects it", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "matching");

  try {
    await page.click('[data-testid="matching-left-1"]');
    await page.click('[data-testid="matching-left-1"]'); // toggle off
    // Should not be in selected (indigo) state
    const el = page.locator('[data-testid="matching-left-1"]');
    await expect(el).not.toHaveClass(/border-indigo-500/);
  } finally {
    await cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Auto-save triggers (across types)
// ─────────────────────────────────────────────────────────────────────────

test("QT-AS-1: auto-save label flips to Saving... then back to Saved after answering true/false", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "true_false");

  try {
    await page.click('[data-testid="true-false-option-true"]');
    // Might briefly show "Saving..."
    // After debounce + API call it should settle on "Saved"
    await expect(page.locator('[data-testid="auto-save-label"]')).toHaveText(
      "Saved",
      {
        timeout: 5_000,
      },
    );
  } finally {
    await cleanup();
  }
});

test("QT-AS-2: auto-save triggers after fill-blank input", async ({
  page,
  request,
}) => {
  const { cleanup } = await setupSingleTypePlayer(page, request, "fill_blank");

  try {
    await page.fill('[data-testid="fill-blank-input"]', "typed answer");
    await expect(page.locator('[data-testid="auto-save-label"]')).toHaveText(
      "Saved",
      {
        timeout: 5_000,
      },
    );
  } finally {
    await cleanup();
  }
});
