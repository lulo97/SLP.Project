# SLP Full Project Playwright Test Document

## 1. Introduction
This document outlines the end‑to‑end (E2E) test strategy for the Self Learning Platform (SLP) using [Playwright](https://playwright.dev/). The goal is to ensure that all critical user journeys and administrative functions work correctly across supported browsers (Chromium, Firefox, WebKit) on desktop and mobile viewports.

Playwright is chosen for its cross‑browser capabilities, auto‑waiting, network interception, and robust testing of modern web applications.

## 2. Scope
The tests cover the following functional areas:
- Authentication & user management
- Quiz creation, editing, duplication, and deletion
- Question bank management
- Quiz taking (attempts, answers, submission, review)
- Source/reading management (upload, text selection actions, explanations, progress)
- Favorites (vocabulary notebook)
- Global search
- Commenting and reporting
- Admin dashboard (users, quizzes, comments, reports)
- Edge cases, error handling, and rate‑limit scenarios

The tests **do not** cover:
- Unit or integration tests of backend services
- Performance or load testing
- Security penetration testing
- Detailed visual regression testing (but can be added via Playwright’s screenshot comparison)

## 3. Test Environment
- **Frontend**: SPA (React/Vue) running on `http://localhost:3000` (or as defined in CI)
- **Backend API**: .NET Core API running on `http://localhost:5000`
- **Database**: PostgreSQL (test instance, reset before each test run)
- **Microservices**: PDF extractor, LLM, TTS, email – should be mocked or pointed to test doubles to ensure deterministic tests.
- **Redis**: In‑memory or test instance for rate limiting and sessions.

### 3.1 Playwright Configuration
- **Browsers**: Chromium, Firefox, WebKit (desktop). Mobile viewports: iPhone 12, Pixel 5.
- **Test runner**: Playwright Test Runner.
- **Fixtures**: Custom fixtures for authenticated pages, admin context, etc.
- **Global setup**: Seed database with test users, quizzes, sources.
- **Reporting**: HTML report, trace on failure.

## 4. Test Data Strategy
- Use a dedicated test database that is recreated from a known seed before the test run.
- Seed data includes:
  - Regular user (username: `testuser`, password: `Password123!`, email confirmed)
  - Admin user (username: `admin`, password: `AdminPass123!`)
  - A few public/private quizzes with questions
  - A source (PDF/text) with known content
  - Sample questions in the bank
  - Some comments, reports, and favorites
- For tests that modify data, we use API calls to reset state after each test or rely on unique generated data (e.g., random quiz titles) to avoid collisions.

## 5. Test Organization
Tests are organized by feature, mirroring the UI structure:
```
tests/
├── auth/
│   ├── login.spec.ts
│   ├── registration.spec.ts
│   ├── password-reset.spec.ts
│   └── email-verification.spec.ts
├── quiz/
│   ├── create.spec.ts
│   ├── edit.spec.ts
│   ├── duplicate.spec.ts
│   ├── delete.spec.ts
│   ├── list-filter.spec.ts
│   └── attempt.spec.ts
├── question-bank/
│   ├── crud.spec.ts
│   ├── filter-search.spec.ts
│   ├── add-to-quiz.spec.ts
│   └── bulk-actions.spec.ts
├── reading/
│   ├── upload.spec.ts
│   ├── text-selection.spec.ts
│   ├── explanations.spec.ts
│   └── progress.spec.ts
├── favorites/
│   ├── add-edit-delete.spec.ts
│   └── search.spec.ts
├── search/
│   └── global-search.spec.ts
├── comments/
│   ├── create-reply.spec.ts
│   ├── edit-delete.spec.ts
│   └── report.spec.ts
├── admin/
│   ├── users.spec.ts
│   ├── quizzes.spec.ts
│   ├── comments.spec.ts
│   └── reports.spec.ts
└── edge/
    ├── rate-limiting.spec.ts
    ├── error-handling.spec.ts
    └── permissions.spec.ts
```

## 6. Test Scenarios and Cases

### 6.1 Authentication
| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Successful login | Navigate to `/login`, enter valid credentials, submit | Redirected to home, user menu shows username |
| Invalid password | Enter wrong password | Error message “Invalid credentials” |
| Rate limiting | Attempt login 11 times within 1 minute | 11th attempt returns 429, user sees rate limit warning |
| Registration | Fill form with unique username, optional email, password | Account created, redirected to email verification prompt (if email provided) or home |
| Password reset request | Enter email of existing user | Success message; email service receives request |
| Password reset confirm | Use token from email, set new password | Can log in with new password |
| Email verification | Request OTP, enter correct OTP | Email marked confirmed, badge appears in profile |

### 6.2 Quiz Management
#### 6.2.1 Create Quiz
- Navigate to `/quizzes`, click “Create Quiz”
- Fill basic info, add a source (select existing or upload)
- Add questions:
  - Create a new multiple choice question from scratch
  - Add a question from bank
- Set tags, save
- Verify quiz appears in “My Quizzes” list with correct details.

#### 6.2.2 Edit Quiz
- Open quiz edit page
- Change title, description, visibility
- Add/remove sources
- Reorder questions via drag‑and‑drop
- Update a question (if from bank, mismatch warning appears)
- Save
- Verify changes reflected in quiz detail.

#### 6.2.3 Duplicate Quiz
- On quiz detail, click “Duplicate”
- New quiz created with “(copy)” suffix, owned by current user
- Verify all questions and sources are copied.

#### 6.2.4 Delete Quiz (admin only)
- Log in as admin, navigate to admin quizzes
- Soft delete a quiz
- Quiz no longer appears in public lists, but still visible to owner with “disabled” badge.

#### 6.2.5 Quiz List Filters
- Apply visibility filter (public/private)
- Search by title
- Filter by tag
- Verify results match.

### 6.3 Quiz Attempt
#### 6.3.1 Start Attempt
- On public quiz detail, click “Start”
- Quiz player opens with first question, progress shows “1/5”

#### 6.3.2 Answer Questions
- Answer a multiple choice question (select option)
- Navigate to next question
- Answer a fill‑in‑blank question
- Use question sidebar to jump to a question and change answer
- Verify auto‑save (after moving away, answer persists on page reload)

#### 6.3.3 Submit Attempt
- After answering all questions, click “Submit”
- Confirmation modal appears; confirm
- Redirect to review page with score and correct/incorrect indicators

#### 6.3.4 Review Attempt
- On review page, verify each question shows user answer and correct answer
- Explanations displayed where available
- Retake button starts new attempt

#### 6.3.5 Resume Abandoned Attempt
- Start an attempt, leave it open > 24h (simulate by manipulating DB)
- Attempt auto‑abandoned; user cannot resume, sees option to start new

### 6.4 Question Bank
#### 6.4.1 CRUD Operations
- Create a new question (all types)
- Edit a question (type immutable, fields update)
- Soft delete a question (removed from list, but quizzes using it show mismatch)
- Restore deleted question (admin only)

#### 6.4.2 Filtering and Search
- Filter by type (e.g., “multiple choice”)
- Filter by tag
- Search by content text
- Verify results correct

#### 6.4.3 Add to Quiz
- From question list, select “Add to quiz”
- Choose target quiz, insertion position
- Confirm question appears in quiz editor at correct position

#### 6.4.4 Bulk Actions
- Select multiple questions, delete
- Select multiple, add tags
- Verify bulk operations succeed

### 6.5 Reading & Sources
#### 6.5.1 Upload Source
- Click “Upload” from sources page
- Upload a PDF file (<20 MB)
- Wait for processing, source card appears with title
- Open source, content displayed

#### 6.5.2 Text Selection Actions
- Select a phrase in source content
- Bubble menu appears with icons
- Click “Explain” – if no explanation, LLM job queued, polling eventually shows explanation
- Click “Add to Favorites” – phrase saved, appears in favorites list
- Click “TTS” – audio plays (mock response)
- Click “Grammar” – grammar suggestions displayed

#### 6.5.3 Explanations
- View explanations for a source
- Add a user explanation for a text range
- Edit own explanation
- Delete own explanation
- System explanations are not editable

#### 6.5.4 Reading Progress
- Scroll through a source, leave page
- Reopen source, “Resume from last position” button appears
- Click it, scroll position restored

### 6.6 Favorites
#### 6.6.1 Add Favorite
- From reading selection bubble, add phrase
- Verify appears in favorites list with correct type
- Alternatively, add via “+” button on favorites page

#### 6.6.2 Edit Favorite
- Click on favorite item, change note
- Save, note updated

#### 6.6.3 Delete Favorite
- Delete from list, item removed

#### 6.6.4 Search Favorites
- Use search bar, filter by text or type

### 6.7 Global Search
- Enter search term in header
- Results grouped by type (quizzes, sources, questions, favorites)
- Click on result navigates to detail
- Pagination works

### 6.8 Comments
#### 6.8.1 Create Comment
- On quiz detail, scroll to comments, write a comment
- Comment appears immediately
- Reply to a comment (nested)

#### 6.8.2 Edit Comment
- Edit own comment, “edited” indicator appears

#### 6.8.3 Delete Comment
- Delete own comment, content replaced with “[deleted]”
- Admin can delete any comment (via admin panel)

#### 6.8.4 Report Comment
- Click “Report” on a comment, select reason
- Report appears in admin reports list

### 6.9 Admin Dashboard
#### 6.9.1 Users
- List users, filter by role/status
- Ban a user, then attempt login as that user – sees banned message
- Unban user, login works

#### 6.9.2 Quizzes
- List all quizzes, filter by disabled
- Disable a quiz, then as normal user try to start it – not allowed
- Enable quiz, attempt allowed

#### 6.9.3 Comments
- List comments, soft delete a comment
- Restore comment, visible again

#### 6.9.4 Reports
- View unresolved reports
- Resolve a report after taking action (e.g., disable quiz)
- Action logged in admin log

### 6.10 Edge Cases & Error Handling
#### 6.10.1 404 Pages
- Navigate to non‑existent quiz, source, question – friendly 404 page

#### 6.10.2 Unauthorized Access
- Try to access admin pages as normal user – redirected or 403

#### 6.10.3 File Upload Limits
- Upload PDF >20 MB – error message
- Upload TXT >5 MB – error message

#### 6.10.4 Rate Limit Reached
- Exceed comment rate limit – see 429 and message

#### 6.10.5 LLM Queue Timeout
- Request LLM explanation while service is down – frontend shows timeout/retry option

#### 6.10.6 Mismatch Notification
- Edit a bank question that is used in a quiz
- As quiz owner, view edit page – warning icon appears next to affected question

## 7. Playwright‑Specific Implementation Notes

### 7.1 Page Object Model
Encapsulate page interactions into reusable classes, e.g.:
- `LoginPage`
- `QuizCreatePage`
- `QuizPlayerPage`
- `QuestionBankPage`
- `AdminUsersPage`

### 7.2 Fixtures
Extend the base test with custom fixtures:
```ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Automatically authenticate as a regular user
  authedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await use(page);
  },
  // Admin context
  adminPage: async ({ page }, use) => {
    // login as admin
    // ...
    await use(page);
  },
});
```

### 7.3 Mocking External Services
- Use Playwright’s request interception to mock LLM responses, TTS audio, email sending, etc.
- For Redis jobs, we can either:
  - Use a test mode where the backend processes LLM requests synchronously.
  - Or poll until the job completes (with a timeout) and mock the LLM service to respond quickly.

### 7.4 Database Seeding & Cleanup
- Before test run, run a global setup script that:
  - Drops and recreates the test database.
  - Runs migrations.
  - Inserts seed data via SQL or API calls.
- After each test, use transactions or unique data to avoid state pollution; otherwise, reset specific data via API.

### 7.5 Visual Regression (Optional)
- For critical UI components (quiz player, reading view), capture screenshots and compare against baselines.

### 7.6 Accessibility Testing
- Integrate `@axe-core/playwright` to run accessibility checks on key pages.

## 8. CI Integration
- Tests run on every pull request and main branch push.
- Use GitHub Actions (or similar) with Playwright’s Docker image.
- Parallelize tests across browsers using Playwright’s sharding.

## 9. Reporting and Debugging
- Generate HTML report with test results.
- On failure, attach Playwright trace, screenshot, and video.
- Use `--trace on` to capture traces for failed tests.