
### Backend (Dev1)
#### Task 13: Question Pagination
- **Endpoint**: `GET /api/question` now accepts `page` (default 1) and `pageSize` (default 20, max 50).
- **Response**: `PaginatedResult<QuestionListDto>` with `items`, `total`, `page`, `pageSize`, `totalPages`.
- **Repository**: Add `skip`/`take` to `SearchAsync`, return `(IEnumerable<Question>, int totalCount)`.
- **Service**: Update `SearchQuestionsAsync` to use pagination.
- **Solution**: Use existing filters; ensure count query is efficient (indexes on `user_id`, `type`, `updated_at`).

#### Task 9: Quiz List Pagination
- **Endpoint**: `GET /api/quiz` extended with `page`, `limit`, `sort`, `order`, `visibility`, `search`, `mine`.
- **Response**: Same paginated structure.
- **Repository**: Apply `Skip`/`Take` after filters.
- **Service**: Respect `mine` flag and visibility rules.
- **Solution**: Default sort by `createdAt DESC`. For public list, exclude disabled quizzes.

### Backend (Dev2)
#### Task 14: Source Parser Microservice
- **New service**: `parser` (Python FastAPI).
- **Endpoints**:
  - `POST /parse/url` – JSON `{ url, title? }` → returns `{ title, raw_text, raw_html, content_json?, metadata }`
  - `POST /parse/file` – multipart `file` → returns `{ title (if extracted), raw_text, content_json?, metadata }`
- **Libraries**: `trafilatura` (HTML), `pypdf` (PDF), `python-magic` (MIME).
- **Security**: Validate URL (no private IPs), file size (PDF ≤20MB, TXT ≤5MB), MIME type.
- **Docker**: Add to `docker-compose.yml` with internal network, expose port 8000, set env `MAX_FILE_SIZE`, `REQUEST_TIMEOUT`.
- **Backend integration**: Modify `SourceService` to call this service when creating URL/file source, store returned data.

#### Task 16: Avatar File Storage Microservice
- **New service**: `filestorage` (Python FastAPI).
- **Endpoints**:
  - `POST /upload` – multipart `file`, returns `{ url: "http://filestorage:8000/files/{uuid}.ext" }`
  - `GET /files/{filename}` – serves file
  - `DELETE /files/{filename}` – deletes file
- **Storage**: Files saved on mounted Docker volume, named with UUID.
- **Allowed formats**: JPEG, PNG; max 2MB.
- **Security**: API key for upload/delete
- **Backend integration**: New `IFileStorageClient` with methods `UploadAvatarAsync`, `DeleteFileAsync`. Add `avatar_url` column to `users` table.
- **Docker**: Add service to compose, volume `filestorage_data`.

### Frontend (Dev1)
#### Task 13 & 9: Pagination UI
- **Store**: Add pagination state (`currentPage`, `pageSize`, `total`) to `questionStore` and `quizStore`.
- **Actions**: Modify `fetch` methods to accept `page` and `pageSize`, update state.
- **Components**: Add `<a-pagination>` below lists, conditionally visible.
- **Reset logic**: On filter/tab change, reset page to 1.
- **Cursor fix**: Add CSS class `.action-icon { cursor: pointer; }` to action icon wrappers.

### Frontend (Dev2)
#### Task 6: Breadcrumb Component
- **Component**: `Breadcrumb.vue` using Ant Design `<a-breadcrumb>`.
- **Props**: `items: Array<{ label: string; path?: string }>`, `maxItems` (default 3) with truncation logic.
- **Integration**: Replace static title in `MobileLayout`’s `#header-left` slot on pages that need breadcrumbs.
- **Pages**: Dashboard, Quiz list, Quiz detail, Quiz edit, Question list, Source list, Source detail, Search, Admin.

#### Task 12: Tag Selector Component
- **Store**: `tagStore` with `tags` array, `fetchTags()` (cached).
- **Component**: `TagSelector.vue` – wraps Ant Design `<a-select mode="tags">`, binds `v-model`, loads options from store, shows loading/error.
- **Usage**: Replace existing tag selects in `QuizFormPage` and `QuestionFormPage`.
- **Solution**: Prevents duplicate tags in selection, max 10 tags enforced (frontend + backend later).

#### Start Task 17: Settings (store & i18n)
- **Store**: `settingsStore` with `theme` (light/dark), `language` (string), persistence to localStorage.
- **i18n**: Install `vue-i18n`, create basic locale files (`en.json`, `vi.json`) with a few strings.
- **Setup**: Integrate i18n in `main.ts`, provide to app.


### Backend (Dev1)
#### Task 1: User Reports Page
- **Endpoints**:
  - `GET /api/user/reports` – returns current user’s reports (ordered by `created_at DESC`)
  - `DELETE /api/user/reports/{id}` – hard delete if `resolved = false` and ownership matches.
- **Repository**: Add `GetByUserIdAsync`, `DeleteAsync` with check.
- **Service**: Enforce resolved check.
- **Solution**: No new table; existing `report` table used. Add index on `user_id` if missing.
