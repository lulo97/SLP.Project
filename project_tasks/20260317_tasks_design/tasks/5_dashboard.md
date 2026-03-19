## Dashboard Page Design – SLP Mobile Application

### 1. Overview & Purpose

The dashboard serves as the authenticated user’s home screen. It should provide:

- **Orientation** – what the app is about and its key capabilities.
- **Daily engagement** – a fresh “word of the day” to encourage vocabulary building.
- **Quick access** – one‑tap entry points to the three core activities (quizzes, questions, sources).
- **Social proof & discovery** – top public quizzes to explore content created by others.
- **Personal progress** – at‑a‑glance counts of the user’s own created items.

The design is **mobile‑first**, uses a single‑column scrollable layout, and leverages components from the existing Ant Design Vue library for consistency and speed of implementation.

---

### 2. Overall Layout & Interaction

- **Header**: Fixed top bar with hamburger menu (opens right sidebar) and page title “Dashboard”.
- **Main content**: Vertical scroll with 5 distinct sections, each separated by a clear heading and subtle divider.
- **Loading states**: Each section displays skeleton placeholders while data is fetched.
- **Empty states**: Sections without data show a friendly message and a relevant action button (e.g., “Create your first quiz”).
- **Refresh**: Pull‑to‑refresh triggers a full reload of all dashboard data.

---

### 3. Section‑by‑Section Design

#### 3.1 App Introduction & Features

| Aspect | Details |
|--------|---------|
| **Original flaw** | A long feature list overwhelms users on a small screen and is rarely read. |
| **Proposed design** | A compact hero card with a tagline and a horizontally scrollable chip row. |
| **UI components** | `<a-card>` with a short description “SLP helps you learn through quizzes, flashcards, reading, and AI tools.” Below it, a `<div class="flex overflow-x-auto gap-2 py-2">` containing chips (Ant Design `<a-tag>` or custom buttons) for each major feature: **Quiz**, **Question Bank**, **Sources**, **Favorites**. Each chip has an icon + label and navigates to the corresponding feature list on tap. |
| **Data source** | Static content; no API needed. |
| **Interaction** | Tapping a chip routes to the respective page (`/quiz`, `/questions`, `/source`, `/profile` → Favorites tab). |
| **Improvement** | Replaces a wall of text with scannable, actionable icons, saving vertical space and increasing engagement. |

#### 3.2 Word of the Day

| Aspect | Details |
|--------|---------|
| **Original flaw** | Displaying full dictionary details (origin, fun fact, example) all at once makes the section tall and cluttered. Users may lose interest. |
| **Proposed design** | Collapsible card showing essential info upfront, with an optional expandable section for deeper details. |
| **UI components** | `<a-card>` with: <br> • **Header**: Large font word (e.g., “Perspicacious”), part of speech (e.g., “adjective”) in smaller grey text. <br> • **Body**: Vietnamese translation (“Sắc sảo”) and a short example sentence truncated to one line. <br> • **Footer**: Two buttons: “🔊 Listen” (TTS) and “⭐ Save” (add to favorites). <br> • **Expandable area**: Tapping a “▼ More” link reveals origin, fun fact, and full example. |
| **Data source** | API endpoint `GET /api/word-of-the-day` returns: `{ word, pronunciation?, partOfSpeech, vietnameseTranslation, example, origin, funFact? }`. Initially seeded with static data; later can be curated from user’s favorites or external dictionary API. |
| **Interaction** | • “Listen” triggers TTS for the English word. <br> • “Save” adds the word to user’s favorites (POST `/api/favorites`). <br> • “More” toggles the extra details. |
| **Improvement** | Progressive disclosure keeps the section compact while allowing curious users to dive deeper. |

#### 3.3 Highlight Features (Quiz, Question, Source)

| Aspect | Details |
|--------|---------|
| **Original flaw** | Three separate cards stacked vertically consume too much space; “Try now” buttons may be redundant if the whole card is tappable. |
| **Proposed design** | A horizontal scrollable row of three cards, each representing one feature. |
| **UI components** | `<div class="flex overflow-x-auto gap-4 pb-2">` containing three `<a-card hoverable>` with fixed width (approx 200px). Each card contains: <br> • Icon (e.g., `📝`, `❓`, `📚`) <br> • Feature title: **Quizzes**, **Questions**, **Sources** <br> • Short description: e.g., “Take or create quizzes”, “Build your question bank”, “Read and analyse sources” <br> • A subtle arrow icon indicating tap to navigate. |
| **Data source** | Static. |
| **Interaction** | Tapping any card navigates to the corresponding list page (`/quiz`, `/questions`, `/source`). |
| **Improvement** | Horizontal scrolling saves vertical real estate and creates a visually engaging carousel. Hover effects (on larger touch devices) give feedback. |

#### 3.4 Top Quizzes

| Aspect | Details |
|--------|---------|
| **Original flaw** | Showing 5 quizzes with full metadata (description, total questions, attempts, comments, author) results in dense, hard‑to‑scan items. On mobile, each item would wrap multiple lines and become cluttered. |
| **Proposed design** | A vertical list of 5 quizzes, each presented as a compact card with key metrics only. Description is omitted; title, author, and three numeric stats are shown inline. |
| **UI components** | `<a-list>` with `<a-list-item>` for each quiz. Each item: <br> • Left side: Title (bold, truncated), author username (small, grey). <br> • Right side: three stats as icon + number: `👁️ {attemptCount}`, `💬 {commentCount}`, `📄 {questionCount}`. <br> • Entire item tappable. <br> • At the bottom of the section, a “See all quizzes” link that navigates to `/quiz`. |
| **Data source** | `GET /api/quizzes/top?by=attempts&limit=5` returns array of `{ id, title, authorUsername, attemptCount, commentCount, questionCount }`. The backend must compute comment counts per quiz (from `comment` table where `target_type='quiz'`). |
| **Interaction** | Tapping a quiz opens its detail page (`/quiz/:id`). |
| **Improvement** | Removes verbose description and uses icons with numbers for at‑a‑glance comparison. The “See all” link encourages further exploration. |

#### 3.5 Total Items (Personal Stats)

| Aspect | Details |
|--------|---------|
| **Original flaw** | Showing global table counts (e.g., total users) is irrelevant to a regular user and feels like admin metrics. It also lacks personal context. |
| **Proposed design** | Display the user’s own content counts in four stat cards, giving a sense of personal contribution and progress. |
| **UI components** | A grid of four `<a-card>` (2 columns, 2 rows) inside a `<div class="grid grid-cols-2 gap-3">`. Each card: <br> • Icon (e.g., `📋`, `❓`, `📁`, `⭐`) <br> • Count in large font <br> • Label (e.g., “My Quizzes”, “My Questions”, “My Sources”, “Favorites”) |
| **Data source** | `GET /api/users/me/stats` returns `{ quizCount, questionCount, sourceCount, favoriteCount }`. Backend can aggregate from respective tables for the authenticated user. |
| **Interaction** | Tapping a stat card navigates to the corresponding list (e.g., “My Quizzes” → `/quiz` with a filter for user’s own quizzes). |
| **Improvement** | Replaces generic system stats with personalised, motivating metrics. The grid layout is compact and visually pleasing. |

---

### 4. Data Requirements (New/Modified API Endpoints)

| Endpoint | Purpose | Response Example |
|----------|---------|------------------|
| `GET /api/word-of-the-day` | Fetch today’s word | `{ word: "perspicacious", partOfSpeech: "adjective", vietnameseTranslation: "sắc sảo", example: "She is a perspicacious student.", origin: "Latin ...", funFact: "..." }` |
| `GET /api/quizzes/top?by=attempts&limit=5` | Top 5 public quizzes by attempt count | `[ { id, title, authorUsername, attemptCount, commentCount, questionCount } ]` |
| `GET /api/users/me/stats` | Personal content counts | `{ quizCount, questionCount, sourceCount, favoriteCount }` |

**Backend considerations**:
- `attemptCount` for a quiz can be obtained by counting rows in `quiz_attempt` where `quiz_id = ?` (and status = completed).
- `commentCount` for a quiz: count comments where `target_type='quiz'` and `target_id = ?` and `deleted_at IS NULL`.
- `questionCount` for a quiz: count `quiz_question` rows with that `quiz_id`.
- Personal stats: all counts should respect soft‑deletes (e.g., only non‑disabled quizzes, non‑deleted sources).

---

### 5. Visual & Interaction Details

- **Spacing**: Consistent padding (16px) around content, 8‑12px gaps between sections.
- **Typography**: Use Inter font (already in project). Section headings: semi‑bold 16px with bottom margin.
- **Touch targets**: All buttons and tappable areas at least 44×44px.
- **Theming**: Respect user’s theme choice (light/dark) via Tailwind dark classes.
- **Loading**: Skeleton placeholders for each section (Ant Design `<a-skeleton>` with custom shapes).
- **Error handling**: If a section fails to load, show a retry button or a friendly message.

---

### 6. Implementation Notes (for Developers)

- Use the existing `MobileLayout` component (with header slot) for the dashboard page.
- Create a new Vue component for each dashboard section to keep code modular.
- Leverage Pinia stores for data fetching (e.g., `useDashboardStore`).
- For horizontal scroll in sections 1 and 3, use native CSS `overflow-x: auto` and hide scrollbar on mobile (standard pattern).
- Ensure the word‑of‑the‑day TTS uses the existing `useTts` composable.

---

### 7. Addressing Original Design Gaps (Summary)

| Gap | Solution |
|-----|----------|
| Verbose feature list | Replaced with scannable chip row |
| Overloaded word of the day | Progressive disclosure collapsible card |
| Stacked feature cards | Horizontal carousel saves space |
| Dense top quiz items | Compact list with icon‑only stats |
| Irrelevant global counts | Personalised stats cards |
| Missing loading/empty states | Skeleton screens and empty messages added |
| No “see all” links | “See all quizzes” link encourages discovery |

This design balances information density with mobile usability, keeps the user engaged, and aligns with the existing SLP feature set and technical stack. It can be implemented directly using the project’s frontend components and minor backend additions.