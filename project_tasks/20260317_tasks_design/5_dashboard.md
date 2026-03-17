5. Finish dashboard page (current is empty)
- Implement word of a day to dashboard

# Dashboard Page Design: Word of the Day

## Overview
The dashboard serves as the user’s home screen after login. Currently empty, it will be enhanced with a **Word of the Day** widget as the primary feature, accompanied by optional supporting widgets (recent quizzes, progress summary, quick actions). This design focuses on the Word of the Day, leveraging existing data structures and services.

---

## 1. Backend API Design

### Endpoint
`GET /api/dashboard/word-of-day`

**Authentication Required:** Yes (current user via session token)

**Response Format:**
```json
{
  "id": 42,
  "text": "serendipity",
  "type": "word",
  "note": "the occurrence of events by chance in a happy or beneficial way",
  "example": "A serendipitous meeting led to a new friendship.",
  "audioUrl": "https://tts.example.com/audio/serendipity.mp3"
}
```
Fields:
- `id`: ID of the favorite item (if from user’s list) or `0` for default fallback.
- `text`: The word/phrase.
- `type`: Always `"word"` for this widget.
- `note`: Definition or user-added note.
- `example`: Optional example sentence (could be stored in `favorite_item.note` or generated).
- `audioUrl`: Optional URL to TTS audio (constructed using TTS service).

### Data Source
Use the existing `favorite_item` table, filtering by:
- `user_id = currentUserId`
- `type = 'word'` (as defined in the table check constraint)
- Optional: ensure `text` is not empty.

If the user has no favorite words, return a default fallback word from a pre‑defined set (e.g., stored in app settings or a static list).

### Selection Algorithm
- **Daily rotation:** Each user gets the same word for a full calendar day (UTC).
- **Cache key:** `word-of-day:{userId}:{yyyy-mm-dd}` stored in Redis with a 24‑hour TTL.
- **Cache miss:**
  1. Query all favorite words of the user.
  2. If count > 0, pick a random word.
  3. If count == 0, use a static fallback word (e.g., "perseverance" with definition).
  4. Cache the result with the daily key.
- **Cache hit:** Return cached word.

### Implementation Notes
- Use `IFavoriteService` to encapsulate logic; add `GetWordOfDayAsync(int userId)` method.
- `FavoriteRepository` can provide `GetRandomWordAsync(userId)`.
- Redis distributed cache is already configured; use `IDistributedCache` with JSON serialization.
- For audio URL, if TTS service is enabled (env `VITE_TTS_URL`), generate URL like `{ttsBaseUrl}/audio?text={encodedWord}`. Include only if user has opted in (future).

---

## 2. Database Considerations
No new tables needed. The `favorite_item` table already supports words with a `type` field and an optional `note` field that can store definitions or example sentences.

**Optional Enhancement:** Add an `example` column to `favorite_item` to store example sentences separately from definitions, but this can be deferred. For now, combine definition and example in `note` using a delimiter or separate lines.

---

## 3. Frontend Implementation

### Dashboard Page Component
Path: `src/features/dashboard/pages/DashboardPage.vue`

**Layout (Mobile‑First, using existing `MobileLayout`):**
- Header: Title "Dashboard" (left), optional actions (right).
- Main content area:
  - **Word of the Day Card** (full width, prominent)
  - **Recent Quizzes** (list of last 3 attempts)
  - **Progress Summary** (simple stats: sources read, quizzes taken)
  - **Quick Actions** (Create Quiz, Add Source, etc.)

### Word of the Day Card (UI Description)
- **Card container:** White background, rounded shadow, padding.
- **Top row:** Icon (BookOpen or Sparkles) + "Word of the Day" label.
- **Large, bold word** (e.g., 32px) centered.
- **Pronunciation button:** Speaker icon next to word (if TTS available).
- **Definition:** Smaller text, grey color, below word.
- **Example sentence:** (optional) italic, grey, with quotation marks.
- **Action buttons:** (optional) "Mark as Learned", "Add to Favorites", "More Info" – but keep minimal for MVP. Could be a "Details" link that opens a modal with full details.

**Loading State:** Skeleton placeholder (grey block with animated pulse).
**Error State:** Show "Unable to load word of the day" with retry button.

### Data Fetching
- On component mount, call `useDashboardStore().fetchWordOfDay()` (Pinia store action).
- Store handles API request, loading, error states, and caching.
- Use `apiClient` to call `GET /dashboard/word-of-day`.

### TTS Integration
- If `VITE_TTS_URL` is defined and audio URL is returned, clicking speaker icon fetches and plays audio.
- Simple implementation: create an `<audio>` element with the URL and call `.play()`.

---

## 4. Pinia Store (Optional)
Create a dedicated dashboard store or extend an existing one.

**Store Structure:**
```ts
interface DashboardState {
  wordOfDay: null | {
    id: number
    text: string
    note: string
    example?: string
    audioUrl?: string
  }
  loading: boolean
  error: string | null
}

actions: {
  async fetchWordOfDay() { ... }
}
```

---

## 5. Edge Cases & Fallbacks
- **No favorite words:** Use a static fallback list (e.g., an array of common English words with definitions). Fallback word should be cached with the same daily rotation to avoid changing on every page reload.
- **API failure:** Show error message; optionally retry after 30 seconds.
- **Word too long:** Truncate definition with ellipsis; word itself should be limited (DB already has `varchar(255)`).
- **TTS unavailable:** Hide speaker icon if `audioUrl` is not provided or TTS service is down.

---

## 6. Future Enhancements
- **Word history:** Allow users to see past words of the day.
- **Gamification:** Streak counter for visiting each day.
- **User‑submitted words:** Let users suggest words with definitions; admin approval.
- **Integration with LLM:** Generate example sentences or explanations on the fly (with caching).

---

## 7. Summary of Changes
- **Backend:** New controller method in `DashboardController` (or extend `FavoriteController`). Service method in `IFavoriteService`. Repository method `GetRandomWordAsync`.
- **Caching:** Use `IDistributedCache` with daily keys.
- **Frontend:** New API call, store action, and UI component in `DashboardPage`.
- **TTS:** Conditional audio playback.

This design keeps the feature simple, uses existing data structures, and provides a meaningful personalized experience on the dashboard.