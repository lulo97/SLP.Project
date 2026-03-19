#### Additional: Cursor Pointer for Quiz List Actions
- **Implementation**: Identify `<span>` wrappers in `QuizListPage.vue`, apply class.

### Backend (Dev1)

#### Task 21: API Metrics Backend

### Frontend (Dev1)

### Frontend (Dev2)
#### Task 15: Search Pagination
- In `SearchPage.vue`, remove infinite scroll logic (intersection observer).
- Enable existing `<a-pagination>` component (already in template but likely hidden). Bind to `searchStore.page`, `totalPages`, etc.
- Ensure page resets to 1 on new search or tab change.
- Add URL sync (optional): update query param `page` and read on mount.
