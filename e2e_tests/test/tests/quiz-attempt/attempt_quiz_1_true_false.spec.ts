
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle } from "../question/utils";
import {
  createEmptyQuiz,
  startAttempt,
  submitAttempt,
  verifyReviewScore,
  deleteQuiz,
  addTrueFalseQuestion,
  answerTrueFalse,
} from "./utils";

test("admin can create a quiz with 1 true/false question, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
test.setTimeout(180000);

  const quizTitle = getUniqueTitle("TF Quiz");
  const questionContent = "Paris is the capital of France.";

  await loginAsAdmin(page);
  const quizId = await createEmptyQuiz(
    page,
    quizTitle,
    "Quiz to test true/false attempt",
    `attempt-${Date.now()}`
  );

  await addTrueFalseQuestion(
    page,
    questionContent,
    true,
    "Paris is indeed the capital of France."
  );

  await startAttempt(page, quizId);

  await answerTrueFalse(page, true);

  await submitAttempt(page);

  await verifyReviewScore(page, 1, 1, 1, 0);

  const questionCard = page.getByTestId("review-question-0");
  await expect(questionCard).toHaveAttribute("data-correct", "true");

  const userAnswer = page.getByTestId("answer-display-true-false");
  await expect(userAnswer).toHaveText("True");

  await page.getByTestId("back-to-quiz").click();
  await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}$`));

  await deleteQuiz(page, quizId, quizTitle);
});