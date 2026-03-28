
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle } from "../question/utils";
import {
  createEmptyQuiz,
  addMultipleChoiceQuestion,
  startAttempt,
  answerMultipleChoice,
  goToNextQuestion,
  submitAttempt,
  verifyReviewScore,
  deleteQuiz,
} from "./utils";

test("admin can create a quiz with 2 multiple-choice questions, attempt it, submit, review, and delete the quiz", async ({
  page,
}) => {
  test.setTimeout(180000);

  const quizTitle = getUniqueTitle("2 MC Quiz");
  const tag = `mc2-${Date.now()}`;
  
  const q1Content = "What is the capital of France?";
  const q1Correct = "Paris";
  const q1Options = ["Berlin", "Madrid", "Paris", "Lisbon"];
  
  const q2Content = "What is the capital of Germany?";
  const q2Correct = "Berlin";
  const q2Options = ["Paris", "Berlin", "Munich", "Frankfurt"];

  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Create an empty quiz
  const quizId = await createEmptyQuiz(
    page,
    quizTitle,
    "Quiz to test two multiple-choice questions",
    tag
  );

  // 3. Add multiple‑choice questions
  await addMultipleChoiceQuestion(page, q1Content, q1Options, q1Correct, `Explanation: ${q1Correct} is the capital.`);
  await addMultipleChoiceQuestion(page, q2Content, q2Options, q2Correct, `Explanation: ${q2Correct} is the capital.`);

  // 4. Start a new attempt
  await startAttempt(page, quizId);

  // 5. Answer both questions
  await answerMultipleChoice(page, q1Correct);
  await goToNextQuestion(page);
  await answerMultipleChoice(page, q2Correct);

  // 6. Submit the attempt
  await submitAttempt(page);

  // 7. Verify review page stats
  await verifyReviewScore(page, 2, 2, 2, 0);

  // 8. Specific verification for question cards (not covered by verifyReviewScore util)
  for (let i = 0; i < 2; i++) {
    const questionCard = page.getByTestId(`review-question-${i}`);
    await expect(questionCard).toHaveAttribute("data-correct", "true");
    
    const userAnswer = page.getByTestId(`review-user-answer-${i}`);
    await expect(userAnswer).toContainText(i === 0 ? q1Correct : q2Correct);
  }

  // 9. Go back to quiz detail and delete the quiz
  await page.getByTestId("back-to-quiz").click();
  await deleteQuiz(page, quizId, quizTitle);
});