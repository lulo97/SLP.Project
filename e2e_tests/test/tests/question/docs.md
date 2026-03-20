### Test Plan: Question Feature

This plan outlines **small, idempotent test scenarios** for the Question feature, covering both backend API and frontend UI where relevant. Each scenario is designed to be run independently without leaving persistent side effects, or with built-in cleanup to ensure repeatability. Test data is kept minimal (e.g., short strings, few options).

---

## 1. Test Environment Setup

- Use a fresh database (or isolated schema) to avoid interference.
- Seed a few predefined tags (e.g., `"math"`, `"vocab"`) to use in tests.
- Ensure a test user exists (`testuser`) with a valid session token.
- Admin user (ID 1) available if needed.

All scenarios that modify data will either:
- Delete the created resource at the end, or
- Use unique identifiers (e.g., timestamp in content) so they don’t conflict.

---

## 2. Test Scenarios

### 2.1 Question Creation

#### Scenario 2.1.1 – Create a valid Multiple Choice question
- **Input**:  
  - Type: `multiple_choice`  
  - Content: `"What is the capital of France?"`  
  - Options: `["Paris", "London", "Berlin", "Madrid"]`  
  - Correct answers: `["Paris"]`  
  - Explanation: `"Paris is the capital of France."`  
  - Tags: `["geography"]` (tag will be created if missing)  
- **Expected outcome**:  
  - API returns `201 Created` with a question object containing an `id`.  
  - The question appears in the list when fetching with `mine=true`.  
  - Tags are attached correctly.  
- **Idempotency**:  
  - Delete the created question after the test (using the returned `id`).  
  - Alternative: use a content string like `"Test MC Q " + Date.now()` to guarantee uniqueness.

#### Scenario 2.1.2 – Create a True/False question
- **Input**:  
  - Type: `true_false`  
  - Content: `"The sun rises in the west."`  
  - Correct answer: `false`  
- **Expected outcome**:  
  - Metadata stored as `{"correctAnswer": false}`.  
  - Successfully created.
- **Cleanup**: Delete the question.

#### Scenario 2.1.3 – Create a Fill Blank question with single keyword
- **Input**:  
  - Type: `fill_blank`  
  - Content: `"The capital of France is _____."`  
  - Keywords: `["Paris"]` (via metadata)  
- **Expected outcome**:  
  - Metadata includes `{"keywords": ["Paris"]}`.  
- **Cleanup**: Delete.

#### Scenario 2.1.4 – Create a Fill Blank question with multiple keywords
- **Input**:  
  - Type: `fill_blank`  
  - Content: `"The two main colours of the French flag are ___ and ___."`  
  - Keywords: `["blue", "red"]` (order matters)  
- **Expected outcome**:  
  - Metadata contains both keywords.  
- **Cleanup**: Delete.

#### Scenario 2.1.5 – Create an Ordering question
- **Input**:  
  - Type: `ordering`  
  - Content: `"Order the planets by distance from the sun (closest first)."`  
  - Ordered items: `["Mercury", "Venus", "Earth", "Mars"]`  
- **Expected outcome**:  
  - Metadata stores `{"items": [{"order_id":1,"text":"Mercury"}, ...]}`.  
- **Cleanup**: Delete.

#### Scenario 2.1.6 – Create a Matching question
- **Input**:  
  - Type: `matching`  
  - Content: `"Match the country to its capital."`  
  - Pairs: `[{left:"France", right:"Paris"}, {left:"Germany", right:"Berlin"}]`  
- **Expected outcome**:  
  - Metadata stores pairs correctly.  
- **Cleanup**: Delete.

#### Scenario 2.1.7 – Validation failures
- **Multiple Choice** with only one option → expect `400 Bad Request`.  
- **Multiple Choice** with no correct answer → expect `400`.  
- **Fill Blank** with empty keyword list → expect `400`.  
- **Fill Blank** with keyword containing spaces → expect `400` (if validation enforces single word).  
- **Ordering** with no items → expect `400`.  
- **Matching** with incomplete pairs (one side empty) → might be allowed or not? Expect validation.  
- **Type** not supported → expect `400`.  
- **Content** empty → expect `400`.  
- No cleanup needed (no resource created).

---

### 2.2 Question Retrieval

#### Scenario 2.2.1 – Get by ID (existing)
- **Setup**: Create a question (any type) and store its ID.  
- **Action**: Call `GET /api/question/{id}`.  
- **Expected**: Returns the full question DTO with correct fields and tags.  
- **Cleanup**: Delete the question.

#### Scenario 2.2.2 – Get by ID (non‑existent)
- **Action**: Call `GET /api/question/99999`.  
- **Expected**: `404 Not Found`.

---

### 2.3 Question Listing & Search

#### Scenario 2.3.1 – List all questions (paginated)
- **Setup**: Create 3 questions of different types, owned by the test user.  
- **Action**: Call `GET /api/question?page=1&pageSize=2`.  
- **Expected**:  
  - Returns 2 items (the most recent 2).  
  - Total count = 3.  
  - Items are sorted by `updatedAt` descending.  
- **Cleanup**: Delete all 3 created questions.

#### Scenario 2.3.2 – Filter by type
- **Action**: `GET /api/question?type=multiple_choice`.  
- **Expected**: Only multiple‑choice questions appear.  
- **Idempotent**: Use existing data or create a known set.

#### Scenario 2.3.3 – Filter by tag
- **Action**: `GET /api/question?tags=math` (assuming some questions have tag `math`).  
- **Expected**: Only questions with that tag.

#### Scenario 2.3.4 – Full‑text search
- **Action**: `GET /api/question?search=capital`.  
- **Expected**: Returns questions whose content or explanation contains `"capital"`.  
- **Idempotent**: Use seeded question(s) that contain the term.

#### Scenario 2.3.5 – Combined filters
- **Action**: `GET /api/question?type=fill_blank&tags=vocab&search=France`.  
- **Expected**: Returns matching subset.  
- **Idempotent**: Use seeded data.

#### Scenario 2.3.6 – “Mine” filter
- **Setup**: Create a question owned by the test user.  
- **Action**: `GET /api/question?mine=true`.  
- **Expected**: Returns only that question (and any other questions owned by the user).  
- **Cleanup**: Delete the created question.

#### Scenario 2.3.7 – Pagination boundaries
- **Action**: `GET /api/question?page=1&pageSize=50` (max allowed 50) → OK.  
- `GET /api/question?page=1&pageSize=100` → should be capped to 50 (or return 400 if too high).  
- `GET /api/question?page=0` → treated as page 1.  
- `GET /api/question?page=999&pageSize=20` → empty list, total count remains.

---

### 2.4 Question Update

#### Scenario 2.4.1 – Update content and tags
- **Setup**: Create a multiple‑choice question.  
- **Action**: `PUT /api/question/{id}` with new content, new tags.  
- **Expected**:  
  - Question content updated.  
  - Tags replaced with new ones.  
  - `updatedAt` changes.  
- **Cleanup**: Delete the question.

#### Scenario 2.4.2 – Update metadata (e.g., add another correct option)
- **Setup**: Multiple‑choice with one correct answer.  
- **Action**: Update metadata to have two correct answers.  
- **Expected**: Metadata reflects change.  
- **Cleanup**: Delete.

#### Scenario 2.4.3 – Change question type (e.g., multiple‑choice → true/false)
- **Setup**: A multiple‑choice question.  
- **Action**: Update type and provide appropriate new metadata (e.g., `correctAnswer: true`).  
- **Expected**: Type changes, old metadata is replaced.  
- **Cleanup**: Delete.

#### Scenario 2.4.4 – Update with invalid data
- **Setup**: Existing question.  
- **Action**: Update with invalid metadata (e.g., empty options for MC).  
- **Expected**: `400 Bad Request`, question unchanged.  
- **Cleanup**: Delete original.

#### Scenario 2.4.5 – Update non‑existent question
- **Action**: `PUT /api/question/99999` with valid payload.  
- **Expected**: `404 Not Found`.

#### Scenario 2.4.6 – Update another user’s question
- **Setup**: Create a question as another user (or use admin).  
- **Action**: Attempt update as test user.  
- **Expected**: `404 Not Found` (or `403 Forbidden` if authorization is checked at controller level).  
- **Cleanup**: Delete the question (as admin).

---

### 2.5 Question Deletion

#### Scenario 2.5.1 – Soft delete (owner)
- **Setup**: Create a question owned by test user.  
- **Action**: `DELETE /api/question/{id}`.  
- **Expected**:  
  - `204 No Content`.  
  - Subsequent `GET` returns `404`.  
  - (If `includeDeleted` parameter existed, it would show; but current repo hard deletes as placeholder; should be soft delete per spec.)  
- **Cleanup**: Not needed (already deleted).

#### Scenario 2.5.2 – Delete non‑existent question
- **Action**: `DELETE /api/question/99999`.  
- **Expected**: `404 Not Found`.

#### Scenario 2.5.3 – Delete another user’s question (non‑admin)
- **Setup**: Create a question with another user.  
- **Action**: Attempt delete as test user.  
- **Expected**: `404 Not Found` (or `403`).  
- **Cleanup**: Delete as admin.

#### Scenario 2.5.4 – Admin can delete any question
- **Setup**: Create a question with any user.  
- **Action**: Use admin session to delete it.  
- **Expected**: `204 No Content`.  
- **Cleanup**: Not needed.

---

### 2.6 Frontend UI Scenarios

These scenarios assume a browser with a logged‑in test user.

#### Scenario 2.6.1 – Create question via form
- **Action**: Navigate to `/question/new`. Fill in a multiple‑choice question with valid data. Click “Create Question”.  
- **Expected**:  
  - Success message appears.  
  - Redirect to `/questions` list page.  
  - New question appears in the list.  
- **Cleanup**: Delete the question from the UI or via API.

#### Scenario 2.6.2 – Edit question
- **Action**: From the list, click Edit on a question. Modify content and tags. Save.  
- **Expected**:  
  - Success message.  
  - Redirect back to list.  
  - Changes reflected in list view.  
- **Cleanup**: Restore original data (or delete after test).

#### Scenario 2.6.3 – Delete question with confirmation
- **Action**: Click Delete on a question, confirm in popup.  
- **Expected**:  
  - Question removed from list.  
  - Success message.  
  - No error.  
- **Cleanup**: Not needed.

#### Scenario 2.6.4 – Form validation
- **Action**: Try to submit a multiple‑choice question with no options.  
- **Expected**: Form displays an error (e.g., “At least two options are required”). Submission blocked.  
- **Idempotent**: No backend call made.

#### Scenario 2.6.5 – Search and filter
- **Action**:  
  1. Type a search term in the search box, press Enter.  
  2. Change type filter to “True/False”.  
  3. Click “Clear” (if available).  
- **Expected**:  
  - List updates accordingly each time.  
  - Pagination works.  
  - No errors.

#### Scenario 2.6.6 – Pagination
- **Action**: If enough questions exist, click next page.  
- **Expected**: List shows next set, pagination control reflects current page.  
- **Idempotent**: Can be performed on existing data.

---

### 2.7 Security & Authorization

#### Scenario 2.7.1 – Unauthenticated requests
- **Action**: Call any protected endpoint (e.g., `GET /api/question`) without session token.  
- **Expected**: `401 Unauthorized`.

#### Scenario 2.7.2 – Session expiry
- **Setup**: Obtain a valid token, then revoke it via database or wait for expiry.  
- **Action**: Call any endpoint.  
- **Expected**: `401 Unauthorized`. Frontend redirects to login.

#### Scenario 2.7.3 – Admin role
- **Action**: Use admin session to list all questions (including those of other users) via `GET /api/question?mine=false` (default).  
- **Expected**: Returns all questions.  
- **Idempotent**: Use existing data.

---

## 3. Cleanup Strategy

- Each test that creates data should have a teardown step that deletes the created resource(s).  
- For frontend tests, use API calls in the test cleanup to remove created questions.  
- For tests that rely on seeded data, ensure that data is not modified by tests (or is reset between test runs).  
- Use unique identifiers (e.g., timestamps) in content to avoid collisions if cleanup fails.

---

## 4. Notes

- The current repository `SoftDeleteAsync` performs a hard delete; this should be replaced with a proper soft delete (setting a `deleted_at` column) to align with the spec. Tests should be updated once that is implemented.  
- The `includeDeleted` parameter is not yet used; tests for it can be added later.  
- All tests should be designed to run in isolation, preferably with a fresh database per test suite.  
- Frontend tests should use mock API responses where appropriate to avoid network dependency, but end‑to‑end tests should run against a real backend instance.