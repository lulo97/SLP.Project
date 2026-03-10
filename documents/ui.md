# Self Learning Platform – Full UI Design

This document provides a comprehensive user interface design for all features of the Self Learning Platform (SLP). It follows a **mobile‑first** approach, ensuring usability on small screens while scaling gracefully to desktop. The design emphasises clarity, minimalism, and ease of learning. All interactions are based on the platform’s functional requirements and backend capabilities.

---

## 1. Global Layout & Navigation

### 1.1 App Shell
- **Header**: Contains the logo (left), a search bar (center on desktop, collapsible on mobile), and user menu (right).
- **Sidebar (optional)**: On desktop, a collapsible sidebar provides quick access to main sections: Home, Quizzes, Reading, Questions (Bank), Favorites, Admin (if user is admin). On mobile, the sidebar is replaced by a bottom navigation bar (or a hamburger menu).
- **Main content area**: Fills the remaining space, with appropriate padding.
- **Footer**: Simple copyright/version info (optional).

### 1.2 User Menu
- Dropdown with: Profile, Settings, Logout.
- If admin, a link to Admin Dashboard.

### 1.3 Search Bar
- Global search across quizzes, sources, questions, favorites.
- As you type, shows recent suggestions (with type icons).
- On mobile, search icon expands to full‑width input.

---

## 2. Authentication Pages

### 2.1 Login
- **URL**: `/login`
- **Layout**: Centered card with platform name and tagline.
- **Fields**:
  - Username (text input)
  - Password (password input)
- **Actions**:
  - Login button (primary)
  - “Forgot password?” link
  - “Create an account” link (to registration)
- **Error handling**: Inline validation messages for incorrect credentials, rate‑limit warnings.

### 2.2 Registration
- **URL**: `/register`
- **Fields**:
  - Username (with real‑time availability check)
  - Email (optional, with format validation)
  - Password (with strength indicator)
  - Confirm password
- **Actions**:
  - Register button
  - Link to login if already have account
- **Post‑registration**: Redirect to email verification prompt (if email provided) or directly to home.

### 2.3 Password Reset
- **Request reset**: Email input, send token.
- **Confirm reset**: Token (pasted from email) + new password + confirm.
- **Success**: Show confirmation with login link.

### 2.4 Email Verification
- **Prompt after registration**: “We’ve sent a 6‑digit code to your email.”
- **Input**: 6 separate boxes for OTP, auto‑focus moves.
- **Resend** link (rate‑limited).
- **Verify** button; success redirects to profile.

---

## 3. Home / Dashboard

- **URL**: `/`
- **Purpose**: Quick overview and entry points.
- **Sections**:
  - **Continue Reading**: List of recently accessed sources with progress bar (if any). Max 3 items.
  - **Recent Quizzes**: List of recently taken or created quizzes (with attempt stats).
  - **Popular Public Quizzes**: (optional) based on view count.
  - **Quick Actions**: “Create Quiz”, “Upload Source”, “Explore Quizzes”.
- **Layout**: Card grid (2 columns on mobile, 3–4 on desktop) or list depending on content.

---

## 4. Quiz Management

### 4.1 Quiz List
- **URL**: `/quizzes`
- **Tabs**: “My Quizzes” (private) and “Public Quizzes”.
- **Filters**: By tag, search (title/description).
- **Sort**: Date (newest/oldest), popularity (views/attempts).
- **Each quiz card** shows:
  - Title, description (truncated)
  - Tags (as chips)
  - Visibility badge (public/private)
  - Question count, attempt count (optional)
  - Actions: edit (if owner), duplicate, delete (admin only).
- **Create new quiz** floating action button.

### 4.2 Quiz Creation / Editing
- **URL**: `/quizzes/new` and `/quizzes/:id/edit`
- **Multi‑step or single page form**:
  - **Basic Info**: Title, description, visibility, associated note (optional).
  - **Sources**: List of attached sources (with add/remove). Adding a source opens a modal to select from existing or upload new.
  - **Questions**:
    - List of questions with drag handles to reorder.
    - Each question card shows: type icon, question text, number of options (if MC), and a warning icon if mismatched with bank.
    - Actions: edit (opens question modal), duplicate, delete.
    - Add question button: dropdown to choose type or “From Bank”.
  - **Tags**: Input with autocomplete (comma‑separated).
- **Save** button (updates quiz and redirects to detail view).

#### Question Editor Modal
- **Fields**:
  - Type (pre‑selected, disabled for bank questions)
  - Content (rich text? – likely plain text with limited formatting)
  - Metadata fields depending on type:
    - **Multiple/Single Choice**: Options list (add/remove, set correct).
    - **Fill in Blank**: Acceptable answers (list).
    - **Ordering**: Items list (order defined by list order, correct order stored separately).
    - **Matching**: Pairs of left/right.
    - **True/False**: Toggle.
    - **Flashcard**: Front/Back fields.
  - Explanation (optional)
  - “Save to Bank” checkbox (if new, creates bank question; if editing, updates bank or creates new version?)
- **For bank questions**: Show a “View in Bank” link and mismatch warning if updated.

### 4.3 Quiz Detail / Public View
- **URL**: `/quizzes/:id`
- **Header**: Title, description, author, tags.
- **Stats**: Attempts, last updated.
- **Actions**:
  - Start quiz (if not disabled and visible)
  - Edit (if owner)
  - Duplicate
  - Report (if public)
- **Comments section** at bottom.

### 4.4 Quiz Player
- **URL**: `/quizzes/:id/attempt` (or inside a modal)
- **Layout**: Question panel with navigation sidebar.
- **Header**: Quiz title, progress (e.g., “Question 3/10”), timer (none).
- **Question area**:
  - Question text (with possible formatting)
  - Answer input (depending on type: radio buttons, checkboxes, text input, drag‑and‑drop list, etc.)
  - “Next” and “Previous” buttons; “Submit” enabled after all questions answered (or manual).
- **Sidebar** (collapsible on mobile): list of question numbers with status icons (answered, unanswered, current). Click to jump.
- **Auto‑save**: Answers saved as soon as user moves away.
- **Submit confirmation**: Modal before final submission.
- **After submit**: Redirect to results/review page.

### 4.5 Attempt Review
- **URL**: `/attempts/:id/review`
- **Header**: Quiz title, date taken, score (X/Y).
- **Question list**: Each question shows:
  - Question text
  - User’s answer (formatted)
  - Correct answer (if incorrect)
  - Explanation (if available)
- **Actions**: Retake quiz, share (copy link).

---

## 5. Question Bank

### 5.1 Access & Navigation
- **Location**: Main navigation – a “Questions” link placed between “Quizzes” and “Reading”.
- **Permissions**: All logged‑in users can view and manage their own questions. Admins can view and manage all questions.
- **Breadcrumbs**: Home > Questions

### 5.2 Layout Overview
Two‑column layout on desktop, collapsing to single column on mobile.
- **Left column (filters)**: Contains search, filters by type, tags, date range. Collapsible on mobile.
- **Right column (main content)**: Displays the list of questions with sorting and pagination controls.
- At the top right of the main column, a **“+ New Question”** button triggers the question creation modal (same as in quiz editor).

### 5.3 Filtering & Search (Left Column)
- **Search bar**: Placeholder “Search by content, explanation, or tags...”. Debounced.
- **Type filter**: Checkbox group for question types (multiple choice, single choice, fill blank, ordering, matching, true/false, flashcard).
- **Tag filter**: Input with autocomplete; selected tags appear as chips.
- **Date range**: From and To date pickers (optional).
- **Owner filter** (admin only): Dropdown to select “All users”, “My questions”, or a specific user.
- **Reset filters**: “Clear all” link.

### 5.4 Question List (Main Column)
- **Sorting**: Dropdown: Newest first (default), Oldest first, Most used (in quizzes), Recently updated.
- **View toggle**: List view (compact) or card view (more details). Default: list view.
- **Items per page**: 20, 50, 100.
- **Question item (list view)**:
  - Type icon
  - Question content (truncated)
  - Tags (up to 3 chips; “+n” if more)
  - Usage count – number of quizzes that use this question. Click shows tooltip with quiz names.
  - Last updated (relative time)
  - Action buttons: Edit, Duplicate, Delete, Add to quiz (plus icon)
- **Question item (card view)**: Larger cards with full question text (up to 3 lines), all tags displayed, explanation snippet. Actions arranged at bottom.
- **Empty state**: Illustration and message: “No questions found. Try adjusting your filters or create a new question.” with “Create New Question” button.

### 5.5 Create/Edit Question Modal
Identical to the one used in quiz editor (see 4.2). Key points:
- Type cannot be changed after creation (immutable to avoid breaking quizzes).
- Metadata fields adapt to type.
- Explanation optional.
- Tags input with autocomplete.
- Save button creates/updates the bank question.

### 5.6 Question Detail Modal (Optional)
Accessible by clicking question content in list view. Shows:
- Full question text and answer options.
- Explanation.
- Tags.
- List of quizzes using this question (with links).
- Actions: Edit, Duplicate, Delete, Add to quiz.

### 5.7 “Add to Quiz” Flow
When user clicks “Add to quiz” icon:
- Step 1: Select Quiz (list of user’s quizzes, searchable; option to create new quiz).
- Step 2: Choose Insertion Point (at end, at specific position, or replace).
- Step 3: Confirm; success message with link to view quiz.

### 5.8 Bulk Actions (Optional)
Select multiple questions via checkboxes:
- Delete (soft delete)
- Add tags (bulk tag assignment)
- Add to quiz (add all selected to a chosen quiz)

### 5.9 Admin Features
- Admin badge on questions from other users.
- Admin can edit any question (with warning if used in quizzes).
- Admin can soft delete and restore (via “Include deleted” filter).
- “Include deleted” checkbox for admins to view soft‑deleted questions (with strikethrough or “deleted” label).

---

## 6. Reading & Sources

### 6.1 Sources List
- **URL**: `/sources`
- **Tabs**: “My Sources” (owned) and “Public Sources” (if any).
- **Cards** show: type icon (PDF, link, note), title, date, progress (if reading).
- **Upload button** (opens modal):
  - Choose type: Upload file (PDF/TXT), Paste text, Enter URL.
  - For file: drag‑and‑drop area, file picker.
  - For text: textarea.
  - For URL: input field.
  - Submit starts processing; shows progress indicator.

### 6.2 Reading View
- **URL**: `/sources/:id`
- **Layout**: Two‑column on desktop (content + tools), single column on mobile with floating tools.
- **Content area**:
  - Renders rich text (TipTap) with proper styling.
  - User can select text (tap‑and‑hold on mobile, click‑drag on desktop).
- **Text selection bubble** (appears near selection):
  - Icons: Explain, Grammar, TTS, Add to Favorites.
  - On mobile, bubble is touch‑friendly (minimum tap target 44×44 px) and anchored to selection.
- **Side tools** (or bottom sheet on mobile):
  - **Explanations** tab: List of explanations for the current text selection (if any). User can add new explanation (editable).
  - **Notes** (personal): Quick sticky note for the source.
  - **Progress**: “Resume from last position” button (based on `user_source_progress`).
- **Progress saving**: Automatically saves position on scroll (debounced).

### 6.3 Explanations List (within source)
- Shows both system‑generated and user explanations.
- Each entry shows: author (system/you), text snippet (the selected text), explanation content.
- User can edit/delete their own explanations (if `editable` true).

---

## 7. Favorites (Vocabulary Notebook)

- **URL**: `/favorites`
- **List** of favorite items, each showing:
  - Text (word/phrase)
  - Type badge (word, phrase, idiom, other)
  - Note (if any)
  - Date added
- **Add new** floating button opens modal:
  - Text (required)
  - Type (dropdown)
  - Note (optional)
- **Inline edit** (tap on item opens modal prefilled).
- **Search** bar to filter by text or type.

---

## 8. Search Results

- **URL**: `/search?q=...`
- **Tabs** (or grouped results): All, Quizzes, Sources, Questions, Favorites.
- Each result card includes:
  - Type icon
  - Title (highlighted match)
  - Snippet of content with match
  - Link to detail
- **Pagination** at bottom.

---

## 9. Tags

- **URL**: `/tags`
- **Cloud** or list of tags with usage counts.
- Clicking a tag shows all associated quizzes/questions.

---

## 10. User Profile

- **URL**: `/profile`
- **Sections**:
  - **Public info**: Username, email (with verification status), member since.
  - **Settings**: Change email, change password.
  - **Email verification** button (if unconfirmed).
  - **Statistics**: Number of quizzes created, attempts taken, sources uploaded, favorites saved.

### 10.1 Change Password
- Form: current password, new password, confirm.

---

## 11. Admin Dashboard

- **URL**: `/admin`
- **Sidebar** (within admin area): Users, Quizzes, Comments, Reports, Logs.
- All tables have search/filter and pagination (20 items per page).

### 11.1 Users
- Table columns: ID, username, email, role, status, created at, actions (ban/unban, view details).
- Click row expands details (profile, quiz count, reports).

### 11.2 Quizzes
- Table: ID, title, author, visibility, disabled flag, created at, actions (disable/enable, soft delete).
- Filters: by visibility, disabled status.

### 11.3 Comments
- Table: comment snippet, author, target, date, soft‑delete status.
- Actions: soft delete, restore.

### 11.4 Reports
- List unresolved reports with target type, target link, reason, reporter, date.
- Buttons: Mark resolved, take action (disable quiz/comment, etc.). All actions logged.

### 11.5 Logs
- View `admin_log` and `llm_log` (read‑only, searchable).

---

## 12. Comments Section (on quizzes, sources, questions)

- Threaded comments (max depth 5).
- Each comment shows: author, timestamp, content (with edit indicator if edited).
- Actions: reply, edit (own), delete (own or admin), report.
- Input box at bottom (if logged in).

---

## 13. Notifications (optional)

- Simple toast notifications for actions: “Quiz saved”, “Explanation queued”, etc.
- For long‑running tasks (LLM), show a progress indicator or polling status.

---

## 14. Responsive Behaviour

- **Mobile (<768px)**:
  - Bottom navigation bar with icons: Home, Quizzes, Reading, Questions, Favorites, Profile.
  - Search bar collapses to icon in header; tap expands.
  - Modals slide from bottom.
  - Text selection bubble positioned near selection, larger tap targets.
- **Tablet (768px–1024px)**:
  - Sidebar can be toggled; bottom nav disappears.
  - Two‑column layouts where appropriate.
- **Desktop (>1024px)**:
  - Full sidebar visible.
  - Maximum content width 1200px for readability.

---

## 15. Common UI Components

### 15.1 Cards
- Rounded corners, subtle shadow, padding.
- Used for quizzes, sources, favorites, search results.

### 15.2 Buttons
- Primary: solid accent color.
- Secondary: outlined.
- Icon buttons for actions (edit, delete, etc.).
- Floating action button (FAB) for primary creation actions.

### 15.3 Forms
- Labels above inputs.
- Inline validation on blur.
- Helper text for format hints.

### 15.4 Modals
- Centered with overlay.
- Title, content, actions (Cancel, Confirm).
- On mobile, full‑screen modal with close button.

### 15.5 Tabs
- Underlined active tab, scrollable on mobile.

### 15.6 Tags / Chips
- Small rounded rectangles with optional remove icon.

### 15.7 Progress Indicators
- Circular spinner for loading.
- Linear progress bar for file uploads, LLM processing.
- Reading progress as horizontal bar on source card.

### 15.8 Empty States
- Illustrations and helpful messages when no data (e.g., “No quizzes yet. Create one!”).

---

## 16. User Flows (Examples)

### 16.1 Creating a Quiz from a Source
1. User uploads a PDF via Sources page.
2. After extraction, they click “Create Quiz from this Source”.
3. They are taken to quiz creation page with the source pre‑attached.
4. They click “Generate Questions” – opens modal to select count and type mix; LLM generates suggestions.
5. They review/edit generated questions, then save quiz.
6. They set visibility to public and publish.

### 16.2 Taking a Quiz
1. User finds a public quiz via search or home page.
2. Clicks “Start Quiz”.
3. Quiz player opens, showing first question.
4. User answers all questions, using sidebar to navigate.
5. Clicks “Submit” when done.
6. Review page shows results and explanations.
7. They can retake or return to quiz detail.

### 16.3 Using Text Selection in Reading
1. User opens a source and scrolls to a paragraph.
2. On mobile, they tap‑and‑hold to select a phrase; handles appear.
3. Upon release, a bubble appears with icons.
4. They tap “Explain” – if explanation exists, it shows; if not, a loading indicator appears while LLM processes (via queue).
5. Explanation appears below the text (or in side panel).
6. They can also tap “Add to Favorites” to save the phrase.

### 16.4 Managing Question Bank
1. User clicks “Questions” in main nav.
2. They filter by type “Multiple Choice” and tag “math”.
3. They see a list of 5 questions.
4. They click “Edit” on one, modify the options, and save.
5. A warning appears that this question is used in 3 quizzes; changes will cause mismatch warnings. They confirm.
6. They select two questions and choose “Add to quiz” → select a quiz → confirm.

---

## 17. Visual Style Notes

- **Color palette**:
  - Primary: calm blue (#3B82F6) – for primary actions, links.
  - Secondary: soft gray for backgrounds, cards.
  - Accent: green for success, red for errors/warnings.
- **Typography**: Sans‑serif (e.g., Inter, Roboto) for readability.
- **Icons**: Use a consistent icon set (e.g., Feather, Material Icons).
- **Dark mode** (optional): Can be implemented with CSS variables.

---

This UI design covers all features described in the SLP design documents, including the Question Bank as a standalone page. It provides a clear blueprint for developers to implement a cohesive, user‑friendly learning platform.