
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle } from "../question/utils";
import {
  createEmptyQuiz,
  startAttempt,
  submitAttempt,
  verifyReviewScore,
  deleteQuiz,
  addMatchingQuestion,
  matchPair,
} from "./utils";

test("admin can create a quiz with a matching question, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
  test.setTimeout(180000);
  
  const quizTitle = getUniqueTitle("Matching Quiz");
  const questionContent = "Match the countries with their capitals.";
  const pairs = [
    { left: "France", right: "Paris" },
    { left: "Germany", right: "Berlin" },
  ];

  await loginAsAdmin(page);
  const quizId = await createEmptyQuiz(
    page,
    quizTitle,
    "Quiz to test matching attempt",
    `attempt-${Date.now()}`
  );

  await addMatchingQuestion(
    page,
    questionContent,
    pairs,
    "Match each country to its capital."
  );

  await startAttempt(page, quizId);

  // Match both pairs
  await matchPair(page, pairs[0].left, pairs[0].right);
  await matchPair(page, pairs[1].left, pairs[1].right);

  // Verify progress
  const matchingComponent = page.getByTestId("question-type-matching");
  const progress = matchingComponent.getByTestId("matching-progress");
  await expect(progress).toHaveText("2 / 2 matched");

  await submitAttempt(page);

  await verifyReviewScore(page, 1, 1, 1, 0);

  const questionCard = page.getByTestId("review-question-0");
  await expect(questionCard).toHaveAttribute("data-correct", "true");

  const userAnswer = page.getByTestId("review-user-answer-0");
  await expect(userAnswer).toContainText("France → Paris");
  await expect(userAnswer).toContainText("Germany → Berlin");

  await page.getByTestId("back-to-quiz").click();
  await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}$`));

  await deleteQuiz(page, quizId, quizTitle);
});