import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle } from "../question/utils";
import {
  createEmptyQuiz,
  addMultipleChoiceQuestion,
  addTrueFalseQuestion,
  addFillBlankQuestion,
  addOrderingQuestion,
  addMatchingQuestion,
  startAttempt,
  answerMultipleChoice,
  answerTrueFalse,
  answerFillBlank,
  matchPair,
  goToNextQuestion,
  submitAttempt,
  verifyReviewScore,
  deleteQuiz,
} from "./utils";

test("admin can create a quiz with all 5 question types, attempt it, answer only MC wrong, score 4/5, and delete the quiz", async ({
  page,
}) => {
  test.setTimeout(180000);

  const quizTitle = getUniqueTitle("Full Quiz Attempt");
  const tag = `full-attempt-${Date.now()}`;

  // ---------- Question definitions ----------
  const mcQuestion = "What is the capital of France?";
  const mcOptions = ["Berlin", "Madrid", "Paris", "Lisbon"];
  const mcCorrect = "Paris";
  const mcWrong = "Berlin";

  const tfQuestion = "Paris is the capital of France.";
  const tfCorrectAnswer = true;

  const fbQuestion = "The capital of France is Paris.";
  const fbKeyword = "Paris";

  const orderingQuestion = "Arrange the planets in order from the Sun:";
  const orderingItems = ["Mercury", "Venus", "Earth"];

  const matchingQuestion = "Match the country with its capital:";
  const matchingPairs = [
    { left: "France", right: "Paris" },
    { left: "Germany", right: "Berlin" },
  ];

  // 1. Login & Quiz Creation
  await loginAsAdmin(page);
  const quizId = await createEmptyQuiz(page, quizTitle, "Quiz with all five question types", tag);

  // 2. Add all 5 question types
  await addMultipleChoiceQuestion(page, mcQuestion, mcOptions, mcCorrect, "Paris is the capital of France.");
  await addTrueFalseQuestion(page, tfQuestion, tfCorrectAnswer, "Paris is indeed the capital of France.");
  await addFillBlankQuestion(page, fbQuestion, fbKeyword, "Paris is the capital of France.");
  await addOrderingQuestion(page, orderingQuestion, orderingItems, "Correct order: Mercury, Venus, Earth.");
  await addMatchingQuestion(page, matchingQuestion, matchingPairs, "Match countries to their capitals.");

  await expect(page.getByTestId("questions-total")).toHaveText("Total: 5");

  // 3. Start Attempt
  await startAttempt(page, quizId);

  // 4. Answer Questions (MC wrong, others correct)
  await answerMultipleChoice(page, mcWrong); // Intentional wrong answer
  await goToNextQuestion(page);

  await answerTrueFalse(page, true);
  await goToNextQuestion(page);

  await answerFillBlank(page, fbKeyword);
  await goToNextQuestion(page);

  // Ordering: Items are already in order, just skip
  await goToNextQuestion(page);

  for (const pair of matchingPairs) {
    await matchPair(page, pair.left, pair.right);
  }
  await expect(page.getByTestId("matching-progress")).toHaveText(`2 / 2 matched`);

  // 5. Submit and Verify Score
  await submitAttempt(page);
  await verifyReviewScore(page, 4, 5, 4, 1);

  // 6. Specific Review Content Verifications
  const reviewCards = page.getByTestId(/^review-question-/);

  // MC should be wrong
  const mcCard = reviewCards.filter({ hasText: mcQuestion }).first();
  await expect(mcCard).toHaveAttribute("data-correct", "false");
  await expect(mcCard.getByTestId(/^review-user-answer-/)).toContainText(mcWrong);

  // T/F should be correct
  const tfCard = page.getByTestId("review-question-1");
  await expect(tfCard).toHaveAttribute("data-correct", "true");
  await expect(tfCard.getByTestId(/^review-user-answer-/)).toContainText("True");

  // Ordering should be correct
  const orderCard = reviewCards.filter({ hasText: orderingQuestion }).first();
  await expect(orderCard).toHaveAttribute("data-correct", "true");
  await expect(orderCard.getByTestId(/^review-user-answer-/)).toContainText("1. Mercury");

  // 7. Cleanup
  await page.getByTestId("back-to-quiz").click();
  await deleteQuiz(page, quizId, quizTitle);
});