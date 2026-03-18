7. Implement review quiz after play and user can report question
- When play quiz user can also report question in middle term
- When review quiz user can also see comment
- When review quiz user can also report comment/report quiz

# Design: Quiz Reporting & Review Enhancements

## Overview
This feature adds the ability for users to:
- Report a question **during a quiz attempt** (mid‑term).
- View comments on the **quiz review page** (after completing an attempt).
- Report a comment or the quiz itself from the **review page**.

The design extends the existing data model, adds new API endpoints, updates the backend services, and modifies the frontend to include reporting UI components.

---

## 1. Database Changes

A new polymorphic table `report` is required to store all reports.  
It references the reporting user, the target (quiz, question, comment), and optionally the attempt during which a question was reported.

**Proposed Table: `public.report`**

| Column         | Type                     | Description                                                      |
|----------------|--------------------------|------------------------------------------------------------------|
| `id`           | integer (PK, serial)     | Primary key                                                     |
| `user_id`      | integer (FK → users)     | The user who created the report (not nullable)                  |
| `target_type`  | varchar(20)              | 'quiz', 'question', or 'comment'                                 |
| `target_id`    | integer                  | ID of the target entity                                          |
| `attempt_id`   | integer (FK → quiz_attempt, nullable) | The attempt during which a question was reported (optional)     |
| `reason`       | text                     | Free‑text explanation provided by the user                       |
| `resolved`     | boolean, default false   | Whether an admin has resolved the report                         |
| `resolved_at`  | timestamptz, nullable    | When the report was resolved                                     |
| `resolved_by`  | integer (FK → users, nullable) | Admin who resolved the report                                   |
| `created_at`   | timestamptz, default now() | Creation timestamp                                               |

**Indexes**  
- `idx_report_target` on `(target_type, target_id)` for filtering by target.
- `idx_report_user` on `user_id` for admin overview.
- `idx_report_unresolved` on `resolved` for quick retrieval of open reports.

**Foreign Keys**  
- `user_id` → `users(id)` ON DELETE CASCADE  
- `attempt_id` → `quiz_attempt(id)` ON DELETE SET NULL  
- `resolved_by` → `users(id)` ON DELETE SET NULL

**Constraints**  
- `CHECK (target_type IN ('quiz', 'question', 'comment'))`

---

## 2. API Endpoints

### 2.1 Create a Report

**POST /api/reports**  
Creates a new report.  
Request body (JSON):
```json
{
  "targetType": "question",          // or "quiz", "comment"
  "targetId": 123,
  "attemptId": 456,                  // optional, only for question reports
  "reason": "The answer is incorrect"
}
```
- Authentication required.
- Validates that the target exists (according to `targetType`).
- If `targetType` is `"question"` and `attemptId` is provided, verifies that the attempt belongs to the current user and that the question was part of that attempt.
- Returns `201 Created` with the created report DTO.

**Report DTO** (returned)
```json
{
  "id": 1,
  "userId": 42,
  "username": "john_doe",
  "targetType": "question",
  "targetId": 123,
  "attemptId": 456,
  "reason": "...",
  "resolved": false,
  "createdAt": "2025-03-17T10:00:00Z"
}
```

### 2.2 List Reports (Admin only)

**GET /api/reports**  
- Optional query parameter `?resolved=false` (default `false`) to filter by resolved status.
- Returns an array of `ReportDto` (including `username` and target details).

### 2.3 Resolve a Report (Admin only)

**POST /api/reports/{id}/resolve**  
- Marks the report as resolved, sets `resolved_by` to the current admin, and `resolved_at` to now.
- Returns `200 OK`.

### 2.4 (Optional) Get Report by ID

**GET /api/reports/{id}**  
- Returns a single report (admin only, or if the report belongs to the current user).

### 2.5 Frontend‑friendly Endpoints

- **GET /api/reports/my** – Returns all reports created by the current user (for showing report history).
- **GET /api/reports/target** – Could be used to check if a user has already reported a specific target (to prevent duplicate reports). But simpler: allow multiple reports from the same user (they can report again if new reason). Admin will see all.

---

## 3. Backend Changes

### 3.1 New Entities and Repositories
- Create `Report` entity class (C#) matching the table.
- Create `IReportRepository` with methods:
  - `AddAsync(Report report)`
  - `GetByIdAsync(int id)`
  - `GetUnresolvedAsync(bool includeResolved = false)`
  - `GetByUserAsync(int userId)`
  - `GetByTargetAsync(string targetType, int targetId)`
  - `UpdateAsync(Report report)`

### 3.2 Service Layer
- **ReportService** implementing `IReportService`:
  - `CreateReportAsync(int userId, CreateReportDto dto)` – validates target existence and optionally attempt ownership.
  - `ResolveReportAsync(int reportId, int adminId)`
  - `GetReportsAsync(bool unresolvedOnly, int? userId)`

### 3.3 Controller
- **ReportsController** with endpoints as defined above.
- Protect admin endpoints with `[Authorize(Roles = "admin")]`.

### 3.4 Integration with Existing Services
- In `AttemptService`, when a question is reported during an attempt, the frontend will call the new report endpoint (not coupled with attempt submission).
- No changes to `QuizAttempt` logic; reporting is independent.

---

## 4. Frontend Changes

### 4.1 Quiz Player (During Attempt)
Add a **Report Question** button somewhere near the question display (e.g., in the header or as a floating action).  
Clicking opens a modal with:
- Pre‑filled target type = "question".
- Hidden fields: targetId (the `original_question_id` or `quiz_question_id`? We should report the original question, not the quiz‑specific snapshot, because the issue is with the question content. But if the quiz uses a snapshot, the problem might be in the snapshot. For simplicity, we report the **quiz question** (the snapshot) – the snapshot is stored and may be edited independently. However, to allow fixing the original question, we might want to link to the original question if present. We'll store both? We can store `quiz_question_id` in a separate column, or store `target_type='quiz_question'`. But the original specification says "report question" – that could be the question itself. Given the existing tables, we have `question` (original) and `quiz_question` (snapshot). Reporting a question during an attempt should probably refer to the `quiz_question` (the specific instance) because the snapshot may differ from the original. Admins can then decide to fix the original or just the snapshot. We'll use `target_type = 'quiz_question'` for reports made during an attempt. For simplicity, we'll keep `target_type = 'question'` to mean the original question, but we need to decide.

We'll define:
- `target_type = 'question'` – refers to the original `question` table.
- `target_type = 'quiz_question'` – refers to the `quiz_question` snapshot.  
We'll also include an optional `quiz_id` or `attempt_id` for context.

In the report modal, the user selects a reason (or types free text). After submission, show a success message.

### 4.2 Attempt Review Page (`AttemptReview.vue`)
- Add a **Report Quiz** button (top of page) that opens a report modal with `targetType='quiz'` and `targetId=quizId`.
- For each **comment** displayed on the page (if comments section is present), add a small **Report** link/button next to each comment. Clicking opens the report modal with `targetType='comment'` and `targetId=commentId`.
- The comments section itself (`CommentsSection`) already exists; we just need to add the report action. We'll enhance the comment item component to include a "Report" icon.

- Also, if we allow reporting individual questions from the review page (e.g., after seeing the correct answer), we could add a **Report Question** button next to each question in the review list. This would be similar to reporting during the attempt, but using the same modal with `targetType='quiz_question'` (or 'question') and the appropriate ID.

### 4.3 Shared Report Modal Component
Create a reusable `ReportModal.vue` component:
- Props: `visible`, `targetType`, `targetId`, `attemptId` (optional).
- Emits: `update:visible`, `report-submitted`.
- Contains a text area for reason and a submit button.
- Calls the `POST /api/reports` endpoint.
- On success, closes modal and shows a notification.

### 4.4 Store and Types
- Add a `reportStore` (Pinia) with actions:
  - `createReport(payload)`
  - `fetchMyReports()` (optional)
- Add TypeScript interfaces for `Report` and `CreateReportDto`.

### 4.5 Admin Panel
Extend the existing admin panel (`AdminPage.vue`) with a new **Reports** tab (already present in the provided code, but we need to implement the actual component). The tab already exists, but it's empty (just `<AdminReports />`). We'll implement `AdminReports.vue` to:
- Fetch unresolved reports from `GET /api/reports?resolved=false`.
- Display them in a table with columns: ID, Reporter, Target, Reason, Created, Actions.
- Actions: 
  - **Resolve** – marks the report as resolved.
  - **View Target** – navigate to the target (quiz, question, or comment parent page).
  - For comment reports: **Delete Comment** (calls admin comment delete endpoint).
  - For quiz reports: **Disable Quiz** (calls admin quiz disable endpoint).
  - For question reports: maybe **Edit Question** (navigate to question edit page) or **Delete Question** (admin action). We'll include appropriate admin actions.

- Also include a filter to show resolved reports.

---

## 5. Security & Permissions

- Any authenticated user can create a report.
- Users cannot report their own content? They might, but it's allowed (e.g., they notice a mistake in their own question). We'll allow it.
- Admins can view all reports and resolve them.
- When deleting a comment or disabling a quiz via a report action, we should also mark the associated reports as resolved (or leave them, but admin would manually resolve). We'll implement the action to both perform the moderation and resolve the report in one step.

---

## 6. Edge Cases & Considerations

- **Duplicate reports**: Allow multiple reports from the same user on the same target (they might have new info). Admins can see all.
- **Reporting a deleted target**: If a comment is deleted before the report is resolved, the report should still be visible (target info may be stale). We can include a snapshot of the target content at report time? Not required initially.
- **Reporting during an attempt**: The attempt may still be in progress; we should not interfere with the attempt flow. The report is submitted asynchronously.
- **Notifications**: Not in scope for this design, but could be added later to notify admins of new reports.

---

## 7. Implementation Plan

1. **Database**: Create the `report` table and add migration.
2. **Backend**: Implement `Report` entity, repository, service, DTOs, and controller with endpoints.
3. **Frontend**: 
   - Create `ReportModal` component.
   - Add report button to quiz player (in `QuizPlayer.vue`).
   - Enhance `AttemptReview.vue` with report buttons for quiz and comments.
   - Implement `AdminReports.vue` with table and actions.
4. **Testing**: Write unit/integration tests for backend; frontend tests with testids (as seen in existing code).

---

## 8. Open Questions

- Should we report the original `question` or the `quiz_question` snapshot? We'll go with `quiz_question` for now, because that's what the user sees. Admins can later fix the original if needed.
- Do we need to store the snapshot text at the time of report? Not initially; we can rely on the snapshot being immutable (though it could be edited later). If editing is allowed, we might want to capture a copy. We can add a `snapshot` JSONB column later if needed.
- Should we include a "report category" dropdown (e.g., "incorrect answer", "spam", "offensive")? For MVP, free text is enough.

This design provides a solid foundation for the requested features while keeping the implementation straightforward and aligned with the existing architecture.