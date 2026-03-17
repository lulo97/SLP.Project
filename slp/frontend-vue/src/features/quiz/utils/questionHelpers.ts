// src/features/quiz/utils/questionHelpers.ts

import type { DisplayQuestion } from "../types";

export function formatQuestionType(type: string): string {
  if (!type) return "Unknown";
  return type
    .split(/[_\-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getQuestionSummary(q: DisplayQuestion): string {
  const type = q.type?.toLowerCase() || "";
  const meta = q.metadata || {};

  switch (type) {
    case "multiple-choice":
    case "multiple_choice": {
      const options = meta.options || [];
      const correctAnswers = meta.correctAnswers || [];
      if (correctAnswers.length === 0) return "No correct answer set";

      // Map option IDs to their text
      const optionMap = new Map(options.map((opt: any) => [opt.id, opt.text]));

      const answerTexts = correctAnswers
        .map((id: string) => optionMap.get(id) || id) // fallback to ID if text missing
        .filter(Boolean);

      if (answerTexts.length === 0) return "Correct answers not found";
      return `Correct: ${answerTexts.join(", ")}`;
    }

    case "true-false":
    case "true_false": {
      const correct = meta.correctAnswer;
      if (correct === undefined) return "No correct answer set";
      return `Correct: ${correct ? "True" : "False"}`;
    }

    case "fill-in-the-blank":
    case "fill_in_the_blank": {
      const answers = meta.answers || [];
      if (answers.length === 0) return "No answers set";
      const preview = answers.map((a: string) => `"${a}"`).join(", ");
      return `Answers: ${preview}`;
    }

    case "matching": {
      const pairs = meta.pairs || [];
      if (pairs.length === 0) return "No pairs set";
      return `Matching (${pairs.length} pairs)`;
    }

    case "ordering": {
      const items = meta.items || [];
      if (items.length === 0) return "No items set";
      return `Ordering (${items.length} items)`;
    }

    case "essay":
      return "Essay question (no correct answer)";

    default:
      return `Type: ${q.type || "unknown"}`;
  }
}
