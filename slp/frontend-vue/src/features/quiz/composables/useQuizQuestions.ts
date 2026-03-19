// src/features/quiz/composables/useQuizQuestions.ts

import { ref } from 'vue';
import { useQuizStore } from '../stores/quizStore';
import type { DisplayQuestion, QuizQuestion } from '../types';
import { message } from 'ant-design-vue';

export function useQuizQuestions(quizId: number) {
  const quizStore = useQuizStore();
  const questions = ref<DisplayQuestion[]>([]);

  const loadQuestions = async () => {
    const data = await quizStore.fetchQuizQuestions(quizId);
    questions.value = data
      .map((q: QuizQuestion) => {
        const snapshot = JSON.parse(q.questionSnapshotJson || '{}');
        return {
          id: q.id,
          content: snapshot.content || '',
          type: snapshot.type || '',
          explanation: snapshot.explanation,
          metadata: snapshot.metadata || {},
          tags: snapshot.tags || [],
          displayOrder: q.displayOrder,
          questionSnapshotJson: q.questionSnapshotJson,
        };
      })
      .sort((a: { displayOrder: number; }, b: { displayOrder: number; }) => a.displayOrder - b.displayOrder);
  };

  const createQuestion = async (
    snapshotJson: string,
    displayOrder: number
  ) => {
    await quizStore.createQuizQuestion(quizId, snapshotJson, displayOrder);
  };

  const updateQuestion = async (
    questionId: number,
    snapshotJson: string,
    displayOrder: number
  ) => {
    await quizStore.updateQuizQuestion(questionId, snapshotJson, displayOrder);
  };

  const deleteQuestion = async (questionId: number) => {
    const success = await quizStore.deleteQuizQuestion(questionId);
    if (success) {
      await loadQuestions();
      message.success('Question deleted');
    } else {
      message.error('Delete failed');
    }
  };

  const reorderQuestions = async (_fromOrder: number, _toOrder: number) => {
    // Implement reorder logic if needed
  };

  return {
    questions,
    loadQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  };
}