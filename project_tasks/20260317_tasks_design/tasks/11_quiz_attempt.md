13. Implemet can't attempt quiz that has no questions

## Design: Prevent Attempt on Quiz with No Questions

### 1. Overview
Users should not be allowed to start an attempt on a quiz that contains zero questions.  
This protection must be implemented both on the frontend (UI/UX) and on the backend (API) to ensure a consistent user experience and to enforce data integrity.

### 2. Backend Changes

#### 2.1. Validate Question Count in Attempt Creation
- **File**: `backend-dotnet/Features/QuizAttempt/AttemptService.cs`  
- **Method**: `StartAttemptAsync(int quizId, int userId)`
- **Action**: After retrieving the quiz via `_quizRepository.GetByIdAsync(...)`, check the number of questions attached to the quiz.

**Logic**:
```csharp
var quiz = await _quizRepository.GetByIdAsync(quizId, includeDisabled: true);
// ... existing validations (quiz exists, visibility, disabled) ...

var questions = quiz.QuizQuestions?.OrderBy(q => q.DisplayOrder).ToList() ?? new List<QuizQuestion>();
if (questions.Count == 0)
{
    throw new InvalidOperationException("Cannot start an attempt on a quiz with no questions.");
}
```

- **Return**: The exception will be caught by the `AttemptController.StartAttempt` endpoint, which returns a `400 Bad Request` with an appropriate error message.

#### 2.2. Ensure Consistency for Other Entry Points
- No other backend endpoints allow starting an attempt; this is the sole entry point.

### 3. Frontend Changes

#### 3.1. Disable “Start Attempt” Button on Quiz Detail/View Pages
- **Files**:
  - `frontend-vue/src/features/quiz/pages/QuizDetailPage.vue` (owner editing view)
  - `frontend-vue/src/features/quiz/pages/QuizViewPage.vue` (public/consumer view)
- **Component**: `<a-button data-testid="start-attempt-button">`
- **Condition**: Disable the button when `questions.length === 0`.
- **Add a tooltip** to explain why it's disabled.

**Example modification**:
```vue
<a-button
  type="primary"
  size="small"
  @click="startAttempt"
  :loading="attemptStore.loading"
  :disabled="questions.length === 0"
  data-testid="start-attempt-button"
>
  Start Attempt
</a-button>
<span v-if="questions.length === 0" class="text-xs text-gray-400 ml-2">
  (Add questions first)
</span>
```
Or use Ant Design’s `a-tooltip` to show the reason on hover.

#### 3.2. Hide or Disable “Start Attempt” in Attempts Section
- The same button appears inside the “Your Attempts” card in both pages. Apply the same `:disabled` binding.

#### 3.3. (Optional) Show a Hint in the Questions Section
- If the quiz has zero questions, the `QuestionsSection` already displays “No questions yet.” – this can serve as a visual cue for the owner. For public viewers, they will see the disabled button with a tooltip.

### 4. Additional Considerations

#### 4.1. Edge Cases
- **Flashcards only**: Flashcards are considered questions (they have a snapshot). They are included in the question count, so they still count as “has questions”. No special handling needed.
- **Questions removed after attempt creation**: This is not a concern because once an attempt exists, the questions are snapshotted. The attempt itself is not affected by later edits.
- **Quiz duplication**: When duplicating a quiz, if the original had zero questions, the duplicate will also have zero questions. The duplicate will correctly show the disabled start button.

#### 4.2. Performance
- The backend check involves a simple `.Count` on a loaded collection; negligible overhead.
- Frontend `questions` array is already computed from the store; the `disabled` binding will react to changes.

### 5. Test Plan
- **Backend**: Call `POST /api/quizzes/{quizId}/attempts` for a quiz with zero questions → expect `400 Bad Request` with message “Cannot start an attempt on a quiz with no questions.”
- **Frontend**: Visit a quiz detail/view page with zero questions → “Start Attempt” button is disabled and shows a tooltip/hint. Visit a quiz with at least one question → button is enabled.
- **Regression**: Ensure that quizzes with questions (including only flashcards) still allow starting attempts.

### 6. Implementation Summary
| Layer      | File(s)                                                       | Change                                                                 |
|------------|---------------------------------------------------------------|-------------------------------------------------------------------------|
| Backend    | `AttemptService.cs`                                           | Add question count validation in `StartAttemptAsync`.                   |
| Frontend   | `QuizDetailPage.vue`, `QuizViewPage.vue`                      | Bind `:disabled` to `questions.length === 0` on start attempt button.  |
| Frontend   | (Optional) `QuizDetailPage.vue`, `QuizViewPage.vue`           | Add tooltip or hint text for disabled button.                           |

This design ensures a robust, user-friendly prevention of attempts on empty quizzes.