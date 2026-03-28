import { ref, computed, watch, watchEffect } from "vue";
import {
  useAttemptStore,
  type StartAttemptResponse,
} from "../stores/attemptStore";
import { debounce } from "lodash-es";
import { message } from "ant-design-vue";

export function useAttempt(quizId: number) {
  const attemptStore = useAttemptStore();
  const attempt = ref<StartAttemptResponse | null>(null);
  const currentIndex = ref(0);
  const answers = ref<Record<number, any>>({});
  const saving = ref(false);
  const loading = ref(false);

  const getDefaultAnswer = (snapshot: any): any => {
    const type = snapshot.type;
    if (type === "multiple_choice") return { selected: [] };
    if (type === "single_choice") return { selected: null };
    if (type === "true_false") return { selected: null };
    if (type === "fill_blank") return { answer: "" };
    if (type === "ordering") return { order: [] };
    if (type === "matching") return { matches: [] };
    if (type === "flashcard") return {};
    return {};
  };

  const validateQuestions = (questions: any[]) => {
    if (!questions || !Array.isArray(questions)) {
      throw new Error(
        `questions is not an array: ${JSON.stringify(questions)}`,
      );
    }
    questions.forEach((q, idx) => {
      if (!q.quizQuestionId) {
        throw new Error(
          `Question at index ${idx} missing quizQuestionId: ${JSON.stringify(q)}`,
        );
      }
      if (
        !q.questionSnapshotJson ||
        typeof q.questionSnapshotJson !== "string"
      ) {
        throw new Error(
          `Question at index ${idx} missing or invalid questionSnapshotJson: ${JSON.stringify(q)}`,
        );
      }
      try {
        JSON.parse(q.questionSnapshotJson);
      } catch (e) {
        throw new Error(
          `Question at index ${idx} has invalid JSON snapshot: ${q.questionSnapshotJson}`,
        );
      }
    });
  };

  const loadAttempt = async (attemptId?: number, randomizeOrder = false) => {
    loading.value = true;
    try {
      if (attemptId) {
        // Resume existing attempt
        const existing = await attemptStore.fetchAttempt(attemptId);

        // Inside loadAttempt, after fetching existing attempt
        existing.answers?.forEach((ans) => {
          try {
            const answerValue = JSON.parse(ans.answerJson);
            const snapshot = JSON.parse(ans.questionSnapshotJson);
            const type = snapshot.type;

            // Normalize based on question type
            let normalized = answerValue;
            if (type === "ordering") {
              // Should be { order: number[] }
              if (
                !answerValue ||
                typeof answerValue !== "object" ||
                !Array.isArray(answerValue.order)
              ) {
                console.warn(
                  `[useAttempt] Normalizing malformed ordering answer for question ${ans.quizQuestionId}`,
                );
                normalized = getDefaultAnswer(snapshot);
              }
            } else if (type === "matching") {
              // Should be { matches: Array<{leftId, rightId}> }
              if (
                !answerValue ||
                typeof answerValue !== "object" ||
                !Array.isArray(answerValue.matches)
              ) {
                console.warn(
                  `[useAttempt] Normalizing malformed matching answer for question ${ans.quizQuestionId}`,
                );
                normalized = getDefaultAnswer(snapshot);
              }
            } else if (
              type === "multiple_choice" ||
              type === "single_choice" ||
              type === "true_false"
            ) {
              // Should have 'selected' property
              if (
                !answerValue ||
                typeof answerValue !== "object" ||
                !("selected" in answerValue)
              ) {
                console.warn(
                  `[useAttempt] Normalizing malformed ${type} answer for question ${ans.quizQuestionId}`,
                );
                normalized = getDefaultAnswer(snapshot);
              }
            } else if (type === "fill_blank") {
              // Should have 'answer' property
              if (
                !answerValue ||
                typeof answerValue !== "object" ||
                !("answer" in answerValue)
              ) {
                console.warn(
                  `[useAttempt] Normalizing malformed fill_blank answer for question ${ans.quizQuestionId}`,
                );
                normalized = getDefaultAnswer(snapshot);
              }
            }
            // For flashcard, no answer needed

            answers.value[ans.quizQuestionId] = normalized;
          } catch (e) {
            console.warn(
              `[useAttempt] Failed to parse answer for question ${ans.quizQuestionId}, using default`,
              e,
            );
            const snapshot = JSON.parse(ans.questionSnapshotJson);
            answers.value[ans.quizQuestionId] = getDefaultAnswer(snapshot);
          }
        });

        if (existing.status !== "in_progress") {
          throw new Error(
            `Attempt ${attemptId} status is ${existing.status}, not in_progress`,
          );
        }
        const sortedAnswers = [...(existing.answers || [])].sort(
          (a, b) => a.id - b.id,
        );
        const questions = sortedAnswers.map((ans, idx) => {
          if (!ans.questionSnapshotJson) {
            throw new Error(
              `Answer at index ${idx} missing questionSnapshotJson: ${JSON.stringify(ans)}`,
            );
          }
          return {
            quizQuestionId: ans.quizQuestionId,
            displayOrder: idx + 1,
            questionSnapshotJson: ans.questionSnapshotJson,
          };
        });
        validateQuestions(questions);
        attempt.value = {
          attemptId: existing.id,
          startTime: existing.startTime,
          questionCount: existing.questionCount,
          maxScore: existing.maxScore,
          questions,
        };

        currentIndex.value = 0;
      } else {
        // New attempt
        attempt.value = await attemptStore.startAttempt(quizId, randomizeOrder);
        if (!attempt.value) throw new Error("startAttempt returned null");
        validateQuestions(attempt.value.questions);

        attempt.value.questions.forEach((q) => {
          const snapshot = JSON.parse(q.questionSnapshotJson);
          let answer;

          // 🆕 Special handling for ordering questions
          if (snapshot.type === "ordering") {
            const items = snapshot.metadata?.items || [];
            const correctOrder = items
              .map((item: any) => item.order_id)
              .sort((a: number, b: number) => a - b);
            answer = { order: correctOrder };

            // Save the default order immediately so it's on the server
            attemptStore
              .submitAnswer(
                attempt.value!.attemptId,
                q.quizQuestionId,
                JSON.stringify(answer),
              )
              .catch((err) => {
                console.error("Failed to save default ordering answer", err);
              });
          } else {
            answer = getDefaultAnswer(snapshot);
          }

          answers.value[q.quizQuestionId] = answer;
        });
      }
    } catch (err) {
      console.error("loadAttempt error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  let computedRunCount = 0;

  const currentQuestion = computed(() => {
    computedRunCount++;
    console.log(
      `[useAttempt] currentQuestion computed run #${computedRunCount}`,
      {
        attemptExists: !!attempt.value,
        currentIndex: currentIndex.value,
      },
    );

    if (!attempt.value) {
      console.log("[useAttempt] attempt.value is null");
      return null;
    }
    if (!attempt.value.questions || !Array.isArray(attempt.value.questions)) {
      console.error(
        "[useAttempt] currentQuestion: questions invalid",
        attempt.value,
      );
      return null;
    }
    const q = attempt.value.questions[currentIndex.value];
    if (!q) {
      console.error(`[useAttempt] no question at index ${currentIndex.value}`);
      return null;
    }
    console.log("[useAttempt] currentQuestion:", {
      quizQuestionId: q.quizQuestionId,
      hasSnapshot: !!q.questionSnapshotJson,
      snapshotType: typeof q.questionSnapshotJson,
      snapshotLength: q.questionSnapshotJson?.length,
      snapshotPreview: q.questionSnapshotJson?.slice(0, 50),
    });
    return q;
  });

  const currentAnswer = computed({
    get: () => {
      if (!currentQuestion.value) return null;
      return answers.value[currentQuestion.value.quizQuestionId] || null;
    },
    set: (val) => {
      if (currentQuestion.value) {
        answers.value[currentQuestion.value.quizQuestionId] = val;
      }
    },
  });

  // Force reactivity: watchEffect and watch on attempt to trigger computed re-evaluation
  watchEffect(() => {
    // This will re-run whenever any reactive dependency inside changes
    const q = currentQuestion.value;
    console.log(
      "[useAttempt] watchEffect triggered, currentQuestion:",
      q ? { id: q.quizQuestionId } : null,
    );
  });

  watch(
    attempt,
    () => {
      console.log(
        "[useAttempt] watch attempt triggered, forcing currentQuestion re-eval",
      );
      // Accessing the computed forces it to re-evaluate if dependencies changed
      //const q = currentQuestion.value;
    },
    { deep: true },
  );

  const saveAnswer = debounce(
    async (quizQuestionId: number, answerJson: string) => {
      if (!attempt.value) return;
      saving.value = true;
      try {
        await attemptStore.submitAnswer(
          attempt.value.attemptId,
          quizQuestionId,
          answerJson,
        );
      } catch (err) {
        message.error("Failed to save answer");
        console.error("saveAnswer error:", err);
      } finally {
        saving.value = false;
      }
    },
    1000,
  );

  const handleAnswerChange = (value: any) => {
    if (!currentQuestion.value) return;
    answers.value[currentQuestion.value.quizQuestionId] = value;
    const answerJson = JSON.stringify(value);
    saveAnswer(currentQuestion.value.quizQuestionId, answerJson);
  };

  const nextQuestion = () => {
    if (
      attempt.value &&
      currentIndex.value < attempt.value.questions.length - 1
    ) {
      currentIndex.value++;
    }
  };

  const prevQuestion = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--;
    }
  };

  const goToQuestion = (index: number) => {
    if (attempt.value && index >= 0 && index < attempt.value.questions.length) {
      currentIndex.value = index;
    }
  };

  const submitAttempt = async () => {
    if (!attempt.value) return null;
    loading.value = true;
    try {
      const result = await attemptStore.submitAttempt(attempt.value.attemptId);
      return result;
    } finally {
      loading.value = false;
    }
  };

  const isComplete = computed(() => {
    if (!attempt.value) return false;
    return attempt.value.questions.every((q) => {
      const snapshot = JSON.parse(q.questionSnapshotJson);
      // Flashcards are informational — never block submission
      if (snapshot.type === "flashcard") return true;

      const ans = answers.value[q.quizQuestionId];
      if (!ans) return false;

      switch (snapshot.type) {
        case "multiple_choice":
          return Array.isArray(ans.selected) && ans.selected.length > 0;
        case "single_choice":
          return ans.selected !== null && ans.selected !== undefined;
        case "true_false":
          return ans.selected !== null && ans.selected !== undefined;
        case "fill_blank":
          return typeof ans.answer === "string" && ans.answer.trim() !== "";
        case "ordering":
          return Array.isArray(ans.order) && ans.order.length > 0;
        case "matching":
          return (
            Array.isArray(ans.matches) &&
            ans.matches.length === snapshot.metadata?.pairs?.length
          );
        default:
          return true;
      }
    });
  });

  // also add answeredCount for the progress indicator
  const answeredCount = computed(() => {
    if (!attempt.value) return 0;
    return attempt.value.questions.filter((q) => {
      const snapshot = JSON.parse(q.questionSnapshotJson);
      if (snapshot.type === "flashcard") return true;
      const ans = answers.value[q.quizQuestionId];
      if (!ans) return false;
      switch (snapshot.type) {
        case "multiple_choice":
          return Array.isArray(ans.selected) && ans.selected.length > 0;
        case "single_choice":
          return ans.selected !== null && ans.selected !== undefined;
        case "true_false":
          return ans.selected !== null && ans.selected !== undefined;
        case "fill_blank":
          return typeof ans.answer === "string" && ans.answer.trim() !== "";
        case "ordering":
          return Array.isArray(ans.order) && ans.order.length > 0;
        case "matching":
          return Array.isArray(ans.matches) && ans.matches.length > 0;
        default:
          return true;
      }
    }).length;
  });

  return {
    attempt,
    loading,
    saving,
    currentIndex,
    currentQuestion,
    currentAnswer,
    loadAttempt,
    handleAnswerChange,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    submitAttempt,
    isComplete,
    answeredCount,
  };
}
