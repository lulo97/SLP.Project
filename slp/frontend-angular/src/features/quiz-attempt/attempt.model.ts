export interface Attempt {
  id: number;
  userId: number;
  quizId: number;
  startTime: string;
  endTime?: string;
  score?: number;
  maxScore: number;
  questionCount: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  answers?: AttemptAnswer[];
}

export interface AttemptAnswer {
  id: number;
  attemptId: number;
  quizQuestionId: number;
  questionSnapshotJson: string;
  answerJson: string;
  isCorrect?: boolean;
}

export interface StartAttemptResponse {
  attemptId: number;
  startTime: string;
  questionCount: number;
  maxScore: number;
  questions: {
    quizQuestionId: number;
    displayOrder: number;
    questionSnapshotJson: string;
  }[];
}

export interface AttemptReview extends Attempt {
  quizTitle: string;
  answerReview: (AttemptAnswer & { isCorrect: boolean })[];
}

// For answer types
export type AnswerValue =
  | { selected: string[] }                     // multiple_choice
  | { selected: string | null }                // single_choice / true_false
  | { answer: string }                         // fill_blank
  | { order: number[] }                        // ordering
  | { matches: Array<{ leftId: number; rightId: number }> } // matching
  | Record<string, never>;                     // flashcard (no answer)