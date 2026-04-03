export interface WordOfTheDay {
  word: string;
  partOfSpeech: string;
  vietnameseTranslation: string;
  example: string;
  origin?: string | null;
  funFact?: string | null;
}

export interface UserStats {
  quizCount: number;
  questionCount: number;
  sourceCount: number;
  favoriteCount: number;
}

// Optional – not used in UI but kept for completeness
export interface TopQuiz {
  id: number;
  title: string;
  authorUsername: string;
  attemptCount: number;
  commentCount: number;
  questionCount: number;
}
