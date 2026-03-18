9. http://localhost:3002/quiz -> Pagination, current view infinite quiz
-  Duplicate Edit Delete buttons -> Change cursor to pointer, current is icon like I

On the quiz list page (`QuizListPage.vue`), the action icons (Duplicate, Edit, Delete) are currently rendered inside `<span>` elements (likely using Ant Design icons with click handlers). By default, these `<span>` elements do not change the cursor to a pointer, so the cursor remains the default text‑selection (I‑beam) when hovering over them, which is confusing for interactive elements.

**Design suggestion:**

- Add a CSS class, e.g., `action-icon`, to each of those `<span>` wrappers, and define `cursor: pointer` in your styles. This will make the cursor change to a hand when hovering, signaling that the icons are clickable.
- Alternatively, if you want a more consistent button‑like appearance, consider using actual `<a-button>` components from Ant Design, which already include the proper cursor and other interactive styling. However, if you prefer the icon‑only look, ensure the wrapper has the pointer cursor.

For now, the cursor fix is a quick improvement that greatly enhances usability.

## Design for Quiz List Pagination

### Overview
The current quiz list page (`QuizListPage.vue`) loads all quizzes at once, which can become inefficient as the number of quizzes grows. To improve performance and user experience, we will implement server‑side pagination. The design covers:

- Backend API enhancements
- Frontend state management (Pinia store)
- UI components and interactions
- Additional UX improvements (cursor pointer for actions)

### 1. Backend API Changes

#### Endpoint: `GET /api/quiz`
We will extend the existing endpoint to accept pagination parameters and return a paginated response.

**Request Parameters**

| Parameter  | Type    | Description                                 | Default |
|------------|---------|---------------------------------------------|---------|
| `page`     | integer | Page number (1‑based)                       | 1       |
| `limit`    | integer | Number of items per page                     | 20      |
| `sort`     | string  | Sort field (e.g., `createdAt`, `title`)     | `createdAt` |
| `order`    | string  | Sort order (`asc` or `desc`)                 | `desc`  |
| `visibility` | string | Filter by visibility (for public tab)       | –       |
| `search`   | string  | Search term (title/description)              | –       |
| `mine`     | boolean | If true, returns only current user's quizzes | –       |

The `mine` flag is mutually exclusive with public visibility filters.

**Response Body** (JSON)

```json
{
  "data": [ ... ],           // array of QuizListDto objects
  "total": 150,              // total number of quizzes matching the criteria
  "page": 2,                  // current page
  "limit": 20,                // items per page
  "totalPages": 8             // computed total pages
}
```

**Backend Implementation Notes**

- The repository layer must support `Skip()` and `Take()` based on `page` and `limit`.
- Sorting should be applied before pagination.
- When `search` is provided, apply ILIKE filters.
- Ensure that the global `Disabled` filter remains in effect (exclude disabled quizzes unless explicitly requested by admin).

### 2. Frontend State Management (Pinia Store)

#### Store State Additions (`quizStore.ts`)

```typescript
// Add to state
pagination: {
  currentPage: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
}
```

#### Modified Actions

All actions that fetch quiz lists (`fetchMyQuizzes`, `fetchPublicQuizzes`, `searchQuizzes`) should accept optional pagination parameters (`page`, `limit`) and merge them into the API request. After receiving the response, update the `quizzes` array and the pagination metadata.

- When switching tabs, reset `currentPage` to 1.
- When searching, reset `currentPage` to 1.
- Provide a new action `setPage(page: number)` to fetch the corresponding page.

#### Example Signature

```typescript
async fetchPublicQuizzes(visibility?: string, page = 1, limit = 20)
```

The store will automatically append the pagination query parameters to the API call.

### 3. UI Components

#### Pagination Component

Place an Ant Design `<a-pagination>` component below the quiz list. It should be conditionally visible only when there is more than one page.

**Key Props:**
- `current`: bound to `quizStore.pagination.currentPage`
- `pageSize`: bound to `quizStore.pagination.pageSize`
- `total`: bound to `quizStore.pagination.total`
- `showSizeChanger`: allow user to change items per page (optional)
- `showQuickJumper`: allow jumping to a specific page (optional)

**Events:**
- `@change` – calls a method that updates the store’s page and refetches the list.

#### Integration with Tabs and Search

- **Tab switch:** When switching between "My Quizzes" and "Public Quizzes", reset the page to 1 and fetch the first page.
- **Search:** When the user submits a search, reset the page to 1 and fetch with the search term.
- **Page change:** When the user clicks a page number, fetch the new page while preserving the current tab and search term.

#### Cursor Pointer for Action Icons

In `QuizListPage.vue`, the action icons (Duplicate, Edit, Delete) are currently wrapped in `<span>` elements. To improve usability, we will:

- Add a CSS class `.action-icon` to each `<span>`.
- In the component’s `<style>` section, define:
  ```css
  .action-icon {
    cursor: pointer;
  }
  ```
- Optionally, replace the `<span>` with an Ant Design `<a-button type="link" size="small">` for better accessibility and consistent styling. If using buttons, the pointer cursor is automatic.

### 4. User Experience Flow

1. User lands on the quiz list page (default "My Quizzes").
2. The first page of quizzes is loaded (e.g., 20 items).
3. At the bottom, a pagination control shows "1 2 3 … Next".
4. User can click page numbers to navigate.
5. If the user switches to "Public Quizzes", the list resets to page 1 and fetches public quizzes.
6. If the user performs a search, the list resets to page 1 with search results.
7. The total number of items and current page are always visible.

### 5. Edge Cases

- **No results:** Show a friendly message (already implemented) and hide pagination.
- **Last page:** The "Next" button should be disabled.
- **Loading state:** While fetching a new page, show a loading spinner (the list already supports `a-list` loading prop).
- **Concurrent requests:** Cancel previous in‑flight requests when new ones are made (optional, can be handled by AbortController).

### 6. Future Considerations

- **Infinite scroll:** If the product direction changes, the pagination component can be swapped for an infinite scroll implementation while keeping the backend pagination.
- **Client‑side caching:** We might cache pages to reduce API calls, but for simplicity, we’ll fetch on every page change.

### 7. Summary of Changes

| Area          | Change                                                                 |
|---------------|------------------------------------------------------------------------|
| Backend       | Add pagination parameters and return paginated response.               |
| Quiz Store    | Store pagination metadata; modify fetch actions to accept page/limit.  |
| QuizListPage  | Add `<a-pagination>` component; wire up page changes.                  |
| Action Icons  | Add `cursor: pointer` to the icon wrappers or use `<a-button>`.        |

This design ensures a scalable and user‑friendly quiz listing experience.