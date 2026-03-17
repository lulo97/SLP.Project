Quiz edit page http://localhost:3002/quiz/368
- Allow to edit note
- Can view source from quiz edit page (open a modal or go to reading source page)

We need to enhance the quiz edit page (currently `QuizFormPage.vue`) to allow the owner to manage **notes** and **sources** directly. The two key features:

1. **Edit existing notes** – currently notes can only be added or removed; we need an edit action.
2. **View a source** – from the list of attached sources, the user should be able to see the source content (either in a modal or by navigating to the source reading page).

Below is a design proposal covering UI/UX changes, component modifications, required backend APIs, and considerations.

---

## 1. Quiz Edit Page Layout Update

The current edit page only contains a form for quiz metadata. We will add two new sections below that form:

- **Notes** – using the existing `NotesSection` component, enhanced with edit capability.
- **Sources** – using the existing `SourcesSection` component, enhanced with a “view” action.

Both sections should be **read‑only** if the user is not the owner – but since the edit page is already owner‑only, we can keep them fully interactive.

---

## 2. Notes Section – Edit Functionality

### 2.1. UI Changes

Inside `NotesSection.vue`, each note card gains an **Edit** button (pencil icon) next to the existing Delete button. Clicking it opens the **Add Note modal**, but pre‑filled with the note’s current title and content, and the modal title changes to “Edit Note”.

### 2.2. Component Changes

- Add a new `edit` event to `NotesSection` (similar to the existing `remove` event).  
  ```ts
  emit('edit', note: NoteDto)
  ```
- In the template, add a button that calls this event.
- The modal’s submit handler must distinguish between “add” and “update” modes. We can pass the note being edited to the parent via the event, and the parent will decide whether to call an update API.

### 2.3. Parent Handling (QuizFormPage)

- Add a reactive variable `editingNote` (or a ref to hold the note being edited).
- When the `edit` event is received, open the modal and set `editingNote`.
- When the modal submits:
  - If `editingNote` exists → call an **update note** API.
  - Otherwise → call the existing **add note** API.
- After a successful update, refresh the notes list.

### 2.4. Backend – Note Update API

Currently there is no endpoint to update a note. We need to create one. Options:

- **Separate Notes controller** (recommended for future expansion) with `PUT /api/notes/{id}`.
- **Reuse Quiz controller** with `PUT /api/quiz/notes/{noteId}`.

Because notes are owned by a user and can be attached to multiple quizzes, a dedicated notes endpoint is cleaner. However, to keep changes minimal, we can add a new method in `QuizService` and a corresponding route in `QuizController`.

**New route:** `PUT /api/quiz/notes/{noteId}`  
**Request body:** `{ title: string, content: string }`  
**Authorization:** The note must belong to the current user.  
**Implementation:**  
- In `IQuizRepository`, add `Task<Note?> GetNoteByIdAsync(int noteId)` and `Task UpdateNoteAsync(Note note)`.
- In `QuizService`, add `UpdateNoteAsync` that checks ownership and updates the note.
- In `QuizController`, add the corresponding action.

---

## 3. Sources Section – View Source

### 3.1. UI Changes

In `SourcesSection.vue`, each source tag should have a small **View** button (eye icon) next to the existing close (detach) button. Clicking it triggers one of two behaviours (choose the one that fits the user experience best):

- **Option A – Navigate to source detail page**  
  Opens the full source reading page (`/source/{id}`) in the same tab. The user can later return to the quiz edit page (e.g., using browser back button or a “Back to quiz” link on the source page).

- **Option B – Open a modal preview**  
  Displays a modal with a simplified preview of the source (title, type, and first N characters of content). The modal also contains a button “Read full source” that navigates to the detail page.

### 3.2. Component Changes

- Add a new `view` event to `SourcesSection`:  
  ```ts
  emit('view', sourceId: number)
  ```
- Add a button that calls this event. The button is only shown if the user has permission to view the source (which they do, as owner).
- Optionally, if we implement a modal, we can keep the modal logic inside `SourcesSection` itself, but it’s cleaner to let the parent handle it.

### 3.3. Parent Handling (QuizFormPage)

- Listen to the `view` event.
- For **navigation**, simply call `router.push(`/source/${sourceId}`)`.
- For **modal preview**, we can fetch the source details (using `sourceStore.fetchSource`) and show a new component `SourcePreviewModal.vue` (see below).

### 3.4. New Component: SourcePreviewModal.vue

This modal will display:

- **Title** and **type** badge.
- If the source has `contentJson` (TipTap), render it using the same rendering logic as in `SourceDetailPage` (the `renderNode` function).
- If the source has `rawText`, show the first 2000 characters (with a “Show more” link that goes to the full page).
- A “Read full source” button that navigates to `/source/{id}`.
- A “Close” button.

The modal can be opened by passing a `sourceId` and fetching the source data on open. We’ll reuse the existing `sourceStore` to get the data.

---

## 4. Summary of Required Backend Changes

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/quiz/notes/{noteId}` | `PUT` | Update a note attached to a quiz (owned by user) | `{ title, content }` | Updated `NoteDto` |

Optionally, if we decide to implement a separate notes controller later, it can be done independently.

---

## 5. Additional Considerations

- **Loading states** – while updating a note or fetching source preview, show a spinner inside the modal/button.
- **Error handling** – display toast messages on failure.
- **Permissions** – the edit page is already protected; all actions (edit note, view source) should be allowed only to the owner.
- **Mobile layout** – ensure the new buttons and modals are responsive. The existing `MobileLayout` wrapper will handle it.
- **Performance** – the source preview modal should not load the entire source content if it’s huge; a truncated version is enough for preview.

---

## 6. Alternative Approach

If we want to keep changes even simpler, we could:

- For **notes**, add an inline edit mode (click on note text to edit) – but a modal is more consistent with the existing add modal.
- For **sources**, only provide a link to the source detail page (no modal). This is the least work, but the user explicitly mentioned “open a modal or go to reading source page”, so we should give the choice.

The design above balances functionality with minimal disruption to existing code.

---

## 7. Next Steps

1. Update `NotesSection.vue` to emit an `edit` event and add an edit button.
2. Modify `QuizFormPage.vue` to include both sections and handle the new events.
3. Implement the note update endpoint in the backend.
4. (Optional) Create `SourcePreviewModal.vue` and implement the view event to open it.
5. Add necessary API calls in `quizStore` and `sourceStore`.

This design keeps the user experience intuitive and aligns with the existing patterns of the application.