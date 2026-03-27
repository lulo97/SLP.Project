import { randomBytes } from 'crypto';

/**
 * Shuffles an array (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Parse snapshot JSON and shuffle options/items for certain question types.
 */
export function shuffleOptionsInSnapshot(snapshotJson: string): string {
  try {
    const snapshot = JSON.parse(snapshotJson);
    if (!snapshot || typeof snapshot !== 'object') return snapshotJson;

    const type = snapshot.type;
    const metadata = snapshot.metadata;
    if (!metadata) return snapshotJson;

    if (type === 'multiple_choice' || type === 'single_choice') {
      if (Array.isArray(metadata.options)) {
        metadata.options = shuffleArray(metadata.options);
      }
    } else if (type === 'ordering') {
      if (Array.isArray(metadata.items)) {
        metadata.items = shuffleArray(metadata.items);
      }
    }
    return JSON.stringify(snapshot);
  } catch {
    return snapshotJson;
  }
}

/**
 * Check if question is a flashcard (not scored)
 */
export function isFlashcard(snapshotJson: string): boolean {
  try {
    const snapshot = JSON.parse(snapshotJson);
    return snapshot?.type === 'flashcard';
  } catch {
    return false;
  }
}

/**
 * Evaluate answer based on question type.
 */
export function evaluateAnswer(snapshotJson: string, answerJson: string): boolean {
  try {
    const question = JSON.parse(snapshotJson);
    const answer = JSON.parse(answerJson);
    const type = question.type;

    switch (type) {
      case 'multiple_choice':
        return evaluateMultipleChoice(question, answer);
      case 'single_choice':
        return evaluateSingleChoice(question, answer);
      case 'true_false':
        return evaluateTrueFalse(question, answer);
      case 'fill_blank':
        return evaluateFillBlank(question, answer);
      case 'ordering':
        return evaluateOrdering(question, answer);
      case 'matching':
        return evaluateMatching(question, answer);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function evaluateMultipleChoice(question: any, answer: any): boolean {
  const correctSet = new Set(question.metadata.correctAnswers.map(id => String(id)));
  const selectedSet = new Set((answer.selected || []).map(id => String(id)));
  return correctSet.size === selectedSet.size && [...correctSet].every(id => selectedSet.has(id));
}

function evaluateSingleChoice(question: any, answer: any): boolean {
  const correctId = String(question.metadata.correctAnswers[0]);
  const selected = String(answer.selected);
  return correctId === selected;
}

function evaluateTrueFalse(question: any, answer: any): boolean {
  const correct = question.metadata.correctAnswer;
  const selected = answer.selected;
  return correct === selected;
}

function evaluateFillBlank(question: any, answer: any): boolean {
  const keywords = question.metadata.keywords.map(k => k.trim().toLowerCase());
  const userAnswer = (answer.answer || '').trim().toLowerCase();
  return keywords.includes(userAnswer);
}

function evaluateOrdering(question: any, answer: any): boolean {
  const items = question.metadata.items;
  const correctOrder = items
    .slice()
    .sort((a, b) => a.order_id - b.order_id)
    .map(item => item.order_id);
  const userOrder = answer.order || [];
  return correctOrder.length === userOrder.length && correctOrder.every((val, idx) => val === userOrder[idx]);
}

function evaluateMatching(question: any, answer: any): boolean {
  const matches = answer.matches || [];
  // Each match should have leftId === rightId (assuming IDs match)
  return matches.every(m => m.leftId === m.rightId);
}