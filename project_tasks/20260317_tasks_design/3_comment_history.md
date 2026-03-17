3. User can view a list of edit version of a comment
- User can edit comment infinite

To support the feature “User can view a list of edit versions of a comment” and “User can edit comment infinite”, you need to introduce version tracking for comments. The current schema only stores the latest content and an `edited_at` timestamp, but no history. Below is a design covering database changes, backend API adjustments, and frontend UI considerations.

---

## 1. Database Design

Create a new table `comment_history` to store each version of a comment. This table will be append‑only; each edit inserts a new row.

```sql
CREATE TABLE public.comment_history (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    comment_id    INTEGER NOT NULL REFERENCES public.comment(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,                     -- snapshot of the content at that time
    edited_at     TIMESTAMP WITH TIME ZONE NOT NULL, -- when this version was created
    -- Optional: store the editor user_id if edits could be made by admins later
    -- editor_id  INTEGER REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_comment_history_comment ON public.comment_history (comment_id);
CREATE INDEX idx_comment_history_edited ON public.comment_history (edited_at);
```

- **comment_id** links to the original comment.
- **content** holds the exact text of the comment after the edit.
- **edited_at** records when this version was saved.
- The primary key is a generated identity for simplicity.

When a comment is first created, you may optionally insert an initial history record with the original content. This gives a complete audit trail from the beginning. Alternatively, you can start recording only after the first edit.

---

## 2. Backend Modifications

### 2.1 Data Layer (Repository)

Extend `ICommentRepository` with methods for history:

```csharp
Task AddHistoryAsync(int commentId, string content);
Task<IEnumerable<CommentHistoryDto>> GetHistoryAsync(int commentId); // returns list ordered by edited_at desc
```

`CommentHistoryDto` would contain at least `Id`, `Content`, `EditedAt`.

The repository implementation will insert into `comment_history` and query it with appropriate ordering.

### 2.2 Service Layer

In `CommentService.UpdateAsync`, after verifying the user owns the comment, **before** updating the comment’s content:

```csharp
// Fetch current comment (including its current content)
var current = await _commentRepo.GetByIdAsync(commentId);
// Save current content to history (unless it's the first edit and you want to record the original)
await _commentRepo.AddHistoryAsync(commentId, current.Content);
// Then update the comment with the new content
current.Content = request.Content;
await _commentRepo.UpdateAsync(current);
```

If you also want to record the initial creation as a history entry, do that in `CreateAsync` after the comment is inserted.

### 2.3 API Endpoints

Add a new read‑only endpoint to retrieve the edit history:

```
GET /api/comments/{id}/history
```

Response: `200 OK` with an array of objects like:

```json
[
  {
    "id": 5,
    "content": "Previous version text...",
    "editedAt": "2025-03-17T10:30:00Z"
  },
  {
    "id": 4,
    "content": "Even older text...",
    "editedAt": "2025-03-16T22:15:00Z"
  }
]
```

The endpoint should be accessible to:
- The comment owner (authenticated user whose ID matches the comment’s `user_id`)
- Admin users (role `admin`)

You may also allow public viewing? Probably not, because edit history might contain sensitive intermediate thoughts. Stick to owner + admin.

### 2.4 Authorization

In the controller method, verify the current user is either the comment author or an admin. Use the same logic as for editing.

---

## 3. Frontend Design

### 3.1 UI Component for Version List

Add a new button “View history” next to the existing Edit/Delete actions on a comment (visible only to owner/admin). Clicking it opens a modal or a drawer.

**Modal content:**
- Title: “Edit history for comment by [username]”
- A list of versions, each showing:
  - The content (maybe truncated with a “Show full” expander)
  - Timestamp of the edit (formatted)
  - Possibly an indicator if it’s the current version
- A “Close” button.

**Optional enhancement:** Allow the user to restore an old version. That would be an extra button per version that calls a new `POST /comments/{id}/restore-version/{historyId}` endpoint (copy the history content back to the main comment). This goes beyond the stated requirement but is a natural extension.

### 3.2 API Integration

In the comment store (e.g., Pinia), add an action:

```typescript
async fetchCommentHistory(commentId: number): Promise<CommentHistoryItem[]>
```

Use this action when the modal is opened.

### 3.3 Performance Considerations

- History can grow large if a comment is edited many times. Implement pagination on the backend for the history list (e.g., `skip` and `take` parameters) and use infinite scroll or “Load more” in the UI.
- Add an index on `comment_id` and `edited_at` to keep queries fast.

---

## 4. Summary of Changes

| Area           | Change                                                                 |
|----------------|------------------------------------------------------------------------|
| Database       | New `comment_history` table, foreign key to `comment`.                |
| Backend        | Repository methods for history, service logic to save old content on update, new API endpoint `/comments/{id}/history`. |
| Frontend       | “View history” button (visible to owner/admin), modal with version list, integration with new API. |
| Authorization  | Access to history limited to comment owner and admin.                 |

This design enables infinite edits while keeping a full audit trail, and provides users with transparency over how a comment evolved. It does not require changes to the existing `comment` table beyond what you already have.