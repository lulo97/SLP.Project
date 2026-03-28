
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle } from "../question/utils";
import {
  createEmptyQuiz,
  startAttempt,
  submitAttempt,
  verifyReviewScore,
  deleteQuiz,
  addMultipleChoiceQuestion,
  answerMultipleChoice,
} from "./utils";

test("admin can create a quiz with 1 multiple-choice question, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
  test.setTimeout(180000);
  
  const quizTitle = getUniqueTitle("MC Quiz");
  const questionContent = "What is the capital of France?";
  const correctAnswerText = "Paris";
  const wrongOption1 = "Berlin";
  const wrongOption2 = "Madrid";
  const wrongOption3 = "Lisbon";
  const options = [wrongOption1, wrongOption2, correctAnswerText, wrongOption3];

  await loginAsAdmin(page);
  const quizId = await createEmptyQuiz(
    page,
    quizTitle,
    "Quiz to test attempt",
    `attempt-${Date.now()}`
  );

  await addMultipleChoiceQuestion(
    page,
    questionContent,
    options,
    correctAnswerText,
    "Paris is the capital of France."
  );

  await startAttempt(page, quizId);

  await answerMultipleChoice(page, correctAnswerText);

  await submitAttempt(page);

  await verifyReviewScore(page, 1, 1, 1, 0);

  const questionCard = page.getByTestId("review-question-0");
  await expect(questionCard).toHaveAttribute("data-correct", "true");

  const userAnswer = page.getByTestId("review-user-answer-0");
  await expect(userAnswer).toContainText(correctAnswerText);

  await page.getByTestId("back-to-quiz").click();
  await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}$`));

  await deleteQuiz(page, quizId, quizTitle);
});