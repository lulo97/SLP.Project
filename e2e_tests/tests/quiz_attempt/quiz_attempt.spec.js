import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:5140/api";

const adminUser = {
  username: "admin",
  password: "123",
};

function generateUniqueId() {
  return Date.now() + Math.floor(Math.random() * 10000);
}

function generateQuiz() {
  const id = generateUniqueId();
  return {
    title: `Playwright Quiz Attempt ${id}`,
    description: "Quiz for testing attempt feature",
    visibility: "private",
    tagNames: ["playwright", "attempt-test"],
  };
}

function createQuestionSnapshot(type, order) {
  const base = {
    type,
    content: `Sample ${type} question ${order}`,
    explanation: `Explanation for ${type}`,
    tags: ["playwright"],
  };

  switch (type) {
    case "multiple_choice":
      return {
        ...base,
        metadata: {
          options: [
            { id: 0, text: "Option A" }, // numeric IDs
            { id: 1, text: "Option B" },
          ],
          correct: [0], // array of numbers
        },
      };
    case "single_choice":
      return {
        ...base,
        metadata: {
          options: [
            { id: 0, text: "Option A" },
            { id: 1, text: "Option B" },
          ],
          correct: [0], // array with one number
        },
      };
    case "true_false":
      return {
        ...base,
        metadata: {
          correct: true,
        },
      };
    case "fill_blank":
      return {
        ...base,
        metadata: {
          answers: ["correct answer", "another correct"],
        },
      };
    case "ordering":
      return {
        ...base,
        metadata: {
          items: ["Item A", "Item B", "Item C"],
          correct_order: [2, 0, 1], // order of indices (numbers)
        },
      };
    case "matching":
      return {
        ...base,
        metadata: {
          pairs: [
            { left: "Left 1", right: "Right A" },
            { left: "Left 2", right: "Right B" },
          ],
        },
      };
    case "flashcard":
      return {
        ...base,
        metadata: {
          front: "Front of flashcard",
          back: "Back of flashcard",
        },
      };
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

test.describe("Quiz Attempt API End-to-End", () => {
  test("Complete attempt flow: start, answer, submit, review", async ({
    request,
  }) => {
    let authToken;

    // 1. Login as admin
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: adminUser,
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    authToken = loginBody.token;
    expect(authToken).toBeTruthy();

    const authHeaders = {
      "X-Session-Token": authToken,
    };

    // 2. Create a quiz with one question of each type
    const quizData = generateQuiz();
    const createQuizRes = await request.post(`${API_BASE_URL}/quiz`, {
      headers: authHeaders,
      data: quizData,
    });
    expect(createQuizRes.status()).toBe(201);
    const quiz = await createQuizRes.json();
    const quizId = quiz.id;

    // Define question types in order
    const questionTypes = [
      "multiple_choice",
      "single_choice",
      "true_false",
      "fill_blank",
      "ordering",
      "matching",
      "flashcard",
    ];

    const questionIds = [];
    for (let i = 0; i < questionTypes.length; i++) {
      const type = questionTypes[i];
      const snapshot = createQuestionSnapshot(type, i + 1);
      const createQRes = await request.post(
        `${API_BASE_URL}/quiz/${quizId}/questions`,
        {
          headers: authHeaders,
          data: {
            questionSnapshotJson: JSON.stringify(snapshot),
            displayOrder: i + 1,
          },
        },
      );
      expect(createQRes.status()).toBe(201);
      const q = await createQRes.json();
      questionIds.push(q.id);
    }

    // Verify question count
    expect(questionIds.length).toBe(7);

    // 3. Start an attempt
    const startRes = await request.post(
      `${API_BASE_URL}/quizzes/${quizId}/attempts`,
      {
        headers: authHeaders,
      },
    );
    expect(startRes.status()).toBe(200);
    const startData = await startRes.json();
    expect(startData).toHaveProperty("attemptId");
    expect(startData).toHaveProperty("questions");
    expect(startData.questions.length).toBe(7);
    const attemptId = startData.attemptId;

    // Max score should be 6 (flashcard not counted)
    expect(startData.maxScore).toBe(6);

    // 4. Submit answers (all correct)
    const answers = [
      // multiple_choice: correct option id 0
      {
        quizQuestionId: questionIds[0],
        answerJson: JSON.stringify({ selected: [0] }),
      }, // array of numbers
      // single_choice: correct id 0
      {
        quizQuestionId: questionIds[1],
        answerJson: JSON.stringify({ selected: 0 }),
      }, // number
      // true_false: correct true
      {
        quizQuestionId: questionIds[2],
        answerJson: JSON.stringify({ selected: true }),
      },
      // fill_blank: correct answer
      {
        quizQuestionId: questionIds[3],
        answerJson: JSON.stringify({ answer: "correct answer" }),
      },
      // ordering: correct order [2,0,1]
      {
        quizQuestionId: questionIds[4],
        answerJson: JSON.stringify({ order: [2, 0, 1] }),
      },
      // matching: left 0 matches right 0, left 1 matches right 1
      {
        quizQuestionId: questionIds[5],
        answerJson: JSON.stringify({ matches: { 0: 0, 1: 1 } }),
      },
      // flashcard: any answer (unscored)
      {
        quizQuestionId: questionIds[6],
        answerJson: JSON.stringify({ front: "any" }),
      },
    ];

    for (const ans of answers) {
      const submitAnsRes = await request.post(
        `${API_BASE_URL}/attempts/${attemptId}/answers`,
        {
          headers: authHeaders,
          data: ans,
        },
      );
      expect(submitAnsRes.status()).toBe(200);
    }

    // 5. Submit the attempt
    const submitRes = await request.post(
      `${API_BASE_URL}/attempts/${attemptId}/submit`,
      {
        headers: authHeaders,
      },
    );
    expect(submitRes.status()).toBe(200);
    const submitted = await submitRes.json();
    expect(submitted.status).toBe("completed");
    expect(submitted.score).toBe(6); // all non‑flashcard correct

    // 6. Get attempt details
    const getAttemptRes = await request.get(
      `${API_BASE_URL}/attempts/${attemptId}`,
      {
        headers: authHeaders,
      },
    );
    expect(getAttemptRes.status()).toBe(200);
    const attempt = await getAttemptRes.json();
    expect(attempt.id).toBe(attemptId);
    expect(attempt.status).toBe("completed");
    expect(attempt.score).toBe(6);

    // 7. Get attempt review
    const reviewRes = await request.get(
      `${API_BASE_URL}/attempts/${attemptId}/review`,
      {
        headers: authHeaders,
      },
    );
    expect(reviewRes.status()).toBe(200);
    const review = await reviewRes.json();
    expect(review.quizTitle).toBe(quizData.title);
    expect(review.answerReview.length).toBe(7);

    // Count correct answers (should be 6)
    const correctCount = review.answerReview.filter((a) => a.isCorrect).length;
    expect(correctCount).toBe(6);

    // Identify the flashcard answer (type "flashcard") and ensure it's not marked correct
    const flashcardAnswer = review.answerReview.find((a) => {
      const snapshot = JSON.parse(a.questionSnapshotJson);
      return snapshot.type === "flashcard";
    });
    expect(flashcardAnswer).toBeDefined();
    expect(flashcardAnswer.isCorrect).toBe(false);

    // 8. Get user attempts for quiz
    const userAttemptsRes = await request.get(
      `${API_BASE_URL}/quizzes/${quizId}/attempts`,
      {
        headers: authHeaders,
      },
    );
    expect(userAttemptsRes.status()).toBe(200);
    const userAttempts = await userAttemptsRes.json();
    expect(userAttempts.length).toBe(1);
    expect(userAttempts[0].id).toBe(attemptId);

    // 9. Edge case: try to submit answer after attempt completed
    const extraAnsRes = await request.post(
      `${API_BASE_URL}/attempts/${attemptId}/answers`,
      {
        headers: authHeaders,
        data: answers[0],
      },
    );
    expect(extraAnsRes.status()).toBe(400); // InvalidOperationException

    // 10. Edge case: try to start attempt on disabled quiz
    // First, disable the quiz (admin only)
    const disableRes = await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: authHeaders,
      data: { disabled: true },
    });
    expect(disableRes.status()).toBe(200);

    const startDisabledRes = await request.post(
      `${API_BASE_URL}/quizzes/${quizId}/attempts`,
      {
        headers: authHeaders,
      },
    );
    expect(startDisabledRes.status()).toBe(400); // InvalidOperationException

    // Re‑enable for cleanup
    await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: authHeaders,
      data: { disabled: false },
    });

    // 11. Edge case: another user's attempt (simulate by using no auth)
    const noAuthRes = await request.get(
      `${API_BASE_URL}/attempts/${attemptId}`,
    );
    expect(noAuthRes.status()).toBe(401);

    // 12. Edge case: non‑existent attempt
    const nonExistentRes = await request.get(
      `${API_BASE_URL}/attempts/999999`,
      {
        headers: authHeaders,
      },
    );
    expect(nonExistentRes.status()).toBe(404);

    // 13. Edge case: start another attempt (should be allowed)
    const startAnotherRes = await request.post(
      `${API_BASE_URL}/quizzes/${quizId}/attempts`,
      {
        headers: authHeaders,
      },
    );
    expect(startAnotherRes.status()).toBe(200);
    const attempt2 = await startAnotherRes.json();
    expect(attempt2.attemptId).not.toBe(attemptId);

    // Clean up second attempt (optional)
    const submit2Res = await request.post(
      `${API_BASE_URL}/attempts/${attempt2.attemptId}/submit`,
      {
        headers: authHeaders,
      },
    );
    expect(submit2Res.status()).toBe(200);

    // 14. Delete the quiz (cascades attempts and answers)
    const delRes = await request.delete(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: authHeaders,
    });
    expect(delRes.status()).toBe(204);

    // Verify attempts are gone
    const getDeletedAttempt = await request.get(
      `${API_BASE_URL}/attempts/${attemptId}`,
      {
        headers: authHeaders,
      },
    );
    expect(getDeletedAttempt.status()).toBe(404);
  });
});
