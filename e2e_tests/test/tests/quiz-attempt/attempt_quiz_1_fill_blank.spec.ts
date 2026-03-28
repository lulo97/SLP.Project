// e2e_tests/test/tests/quiz-attempt/attempt_quiz_1_fill_blank.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle } from "../question/utils";
import {
  createEmptyQuiz,
  startAttempt,
  submitAttempt,
  verifyReviewScore,
  deleteQuiz,
  addFillBlankQuestion,
  answerFillBlank,
} from "./utils";

test("admin can create a quiz with 1 fill‑in‑the‑blank question, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
  test.setTimeout(180000);
  
  const quizTitle = getUniqueTitle("Fill Blank Quiz");
  const questionContent = "The capital of France is Paris.";
  const correctAnswer = "Paris";
  const explanation = "Paris is the capital of France.";

  await loginAsAdmin(page);
  const quizId = await createEmptyQuiz(
    page,
    quizTitle,
    "Quiz to test fill‑in‑the‑blank attempt",
    `attempt-${Date.now()}`
  );

  await addFillBlankQuestion(page, questionContent, correctAnswer, explanation);

  await startAttempt(page, quizId);

  await answerFillBlank(page, correctAnswer);

  await submitAttempt(page);

  await verifyReviewScore(page, 1, 1, 1, 0);

  const questionCard = page.getByTestId("review-question-0");
  await expect(questionCard).toHaveAttribute("data-correct", "true");

  const userAnswer = page.getByTestId("review-user-answer-0");
  await expect(userAnswer).toContainText(correctAnswer);

  await page.getByTestId("back-to-quiz").click();
  await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}$`));

  await deleteQuiz(page, quizId, quizTitle);
});