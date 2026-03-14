// src/features/quiz/utils/questionHelpers.ts

import type { DisplayQuestion } from "../types";

export function formatQuestionType(type: string): string {
  if (!type) return 'Unknown';
  return type
    .split(/[_\-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getQuestionSummary(q: DisplayQuestion): string {
  const type = q.type?.toLowerCase() || '';
  const meta = q.metadata || {};

  switch (type) {
    case 'multiple-choice':
    case 'multiple_choice': {
      // options not needed; compute correct letters
      const correctIndices =
        meta.correctAnswers || (meta.correctAnswerIndex !== undefined ? [meta.correctAnswerIndex] : []);
      if (correctIndices.length === 0) return 'No correct answer set';
      const letters = correctIndices.map((i: number) => String.fromCharCode(65 + i)).join(', ');
      return `Correct: ${letters}`;
    }

    case 'true-false':
    case 'true_false': {
      const correct = meta.correctAnswer;
      if (correct === undefined) return 'No correct answer set';
      return `Correct: ${correct ? 'True' : 'False'}`;
    }

    case 'fill-in-the-blank':
    case 'fill_in_the_blank': {
      const answers = meta.answers || [];
      if (answers.length === 0) return 'No answers set';
      const preview = answers.map((a: string) => `"${a}"`).join(', ');
      return `Answers: ${preview}`;
    }

    case 'matching': {
      const pairs = meta.pairs || [];
      if (pairs.length === 0) return 'No pairs set';
      return `Matching (${pairs.length} pairs)`;
    }

    case 'ordering': {
      const items = meta.items || [];
      if (items.length === 0) return 'No items set';
      return `Ordering (${items.length} items)`;
    }

    case 'essay':
      return 'Essay question (no correct answer)';

    default:
      return `Type: ${q.type || 'unknown'}`;
  }
}