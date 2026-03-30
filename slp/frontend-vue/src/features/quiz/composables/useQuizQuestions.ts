import { ref } from "vue";
import { useQuizStore } from "../stores/quizStore";
import type { DisplayQuestion, QuizQuestion } from "../types";
import { message } from "ant-design-vue";

export function useQuizQuestions(quizId: number) {
  const quizStore = useQuizStore();
  const questions = ref<DisplayQuestion[]>([]);
  // Local saving flag — never touches quizStore.loading so the page never re-spins
  const saving = ref(false);

  const toDisplay = (q: QuizQuestion): DisplayQuestion => {
    const snapshot = JSON.parse(q.questionSnapshotJson || "{}");
    return {
      id: q.id,
      content: snapshot.content || "",
      type: snapshot.type || "",
      explanation: snapshot.explanation,
      metadata: snapshot.metadata || {},
      tags: snapshot.tags || [],
      displayOrder: q.displayOrder,
      questionSnapshotJson: q.questionSnapshotJson,
    };
  };

  const loadQuestions = async () => {
    const data = await quizStore.fetchQuizQuestions(quizId);
    questions.value = (data as QuizQuestion[])
      .map(toDisplay)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  };

  const createQuestion = async (
    snapshotJson: string,
    displayOrder: number,
    originalQuestionId?: number,
  ) => {
    const raw = await quizStore.createQuizQuestion(
      quizId,
      snapshotJson,
      displayOrder,
      originalQuestionId,
    );
    // Push directly into the local array — no re-fetch needed
    const snapshot = JSON.parse(snapshotJson);
    const newQuestion: DisplayQuestion = {
      id: raw.id,
      content: snapshot.content || "",
      type: snapshot.type || "",
      explanation: snapshot.explanation,
      metadata: snapshot.metadata || {},
      tags: snapshot.tags || [],
      displayOrder,
      questionSnapshotJson: snapshotJson,
    };
    questions.value = [...questions.value, newQuestion].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
  };

  const updateQuestion = async (
    questionId: number,
    snapshotJson: string,
    displayOrder: number,
  ) => {
    await quizStore.updateQuizQuestion(questionId, snapshotJson, displayOrder);
    // Patch in-place — no re-fetch needed
    const idx = questions.value.findIndex((q) => q.id === questionId);
    if (idx !== -1) {
      const snapshot = JSON.parse(snapshotJson);
      questions.value[idx] = {
        ...questions.value[idx],
        id: questionId,
        content: snapshot.content || "",
        type: snapshot.type || "",
        explanation: snapshot.explanation,
        metadata: snapshot.metadata || {},
        tags: snapshot.tags || [],
        displayOrder,
        questionSnapshotJson: snapshotJson,
      };
      questions.value = [...questions.value].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      );
    }
  };

  const deleteQuestion = async (questionId: number) => {
    const success = await quizStore.deleteQuizQuestion(questionId);
    if (success) {
      // Optimistic removal — no re-fetch needed
      questions.value = questions.value.filter((q) => q.id !== questionId);
      message.success("Question deleted");
    } else {
      message.error("Delete failed");
    }
  };

  const reorderQuestions = async (_fromOrder: number, _toOrder: number) => {
    // Implement reorder logic if needed
  };

  return {
    questions,
    saving,
    loadQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  };
}
