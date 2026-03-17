15. http://localhost:3002/questions implement pagination (current show infinite)

To implement pagination for the `/questions` endpoint, we need to modify both the backend API to support paginated responses and the frontend to handle fetching and displaying paginated data. The current implementation returns all questions at once, which becomes inefficient as the question bank grows. The goal is to introduce pagination with configurable page size and to adapt the frontend’s infinite scroll behavior to load data in chunks.

Below is a high‑level design covering the necessary changes in the architecture, data flow, and user experience.

---

## 1. Backend Changes

### 1.1 API Contract
Add pagination parameters to the existing `GET /api/question` endpoint:

**Request**  
- `page` (int, default = 1) – the page number to retrieve.  
- `pageSize` (int, default = 20) – number of items per page.  
- All existing filter parameters (`search`, `type`, `tags`, `mine`) remain unchanged.

**Response**  
Return a JSON object that contains both the paginated items and metadata:

```json
{
  "items": [ ... ],          // array of QuestionListDto
  "total": 42,               // total number of matching questions
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

The controller will accept the pagination parameters via `[FromQuery]` and pass them to the service.

### 1.2 New DTOs
Create a generic `PaginatedResult<T>` class to be used across the application:

```csharp
public class PaginatedResult<T>
{
    public List<T> Items { get; set; }
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
}
```

The service methods that return lists will be updated to return `PaginatedResult<QuestionListDto>`.

### 1.3 Repository Layer
Modify the `SearchAsync` method in `IQuestionRepository` to accept pagination parameters and return both the filtered items and the total count. A common pattern is to use an output parameter or a tuple:

```csharp
Task<(IEnumerable<Question> Items, int TotalCount)> SearchAsync(
    string? searchTerm, 
    string? type, 
    List<string>? tags, 
    int? userId,
    int skip, 
    int take);
```

In the implementation:
- Build the `IQueryable<Question>` with all filters as before.
- Execute a count query (`CountAsync`) to get the total number of matching records.
- Apply `Skip(skip)` and `Take(take)` to the query and fetch the items.
- Return both.

This approach ensures that the count query respects all filters and runs efficiently.

### 1.4 Service Layer
Update `IQuestionService.SearchQuestionsAsync` to accept pagination parameters and return `PaginatedResult<QuestionListDto>`:

```csharp
Task<PaginatedResult<QuestionListDto>> SearchQuestionsAsync(
    QuestionSearchDto search, 
    int page, 
    int pageSize);
```

Inside the method:
- Calculate `skip = (page - 1) * pageSize`.
- Call the repository to get the items and total count.
- Map the items to `QuestionListDto`.
- Construct and return the `PaginatedResult`.

### 1.5 Controller Adaptation
Modify the `GetQuestions` action to read `page` and `pageSize` from the query string. After calling the service, return a 200 OK with the paginated result.

```csharp
[HttpGet]
public async Task<IActionResult> GetQuestions(
    [FromQuery] string? search,
    [FromQuery] string? type,
    [FromQuery] List<string>? tags,
    [FromQuery] bool? mine,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20)
{
    // ... handle 'mine' flag as before
    var searchDto = new QuestionSearchDto { ... };
    var result = await _questionService.SearchQuestionsAsync(searchDto, page, pageSize);
    return Ok(result);
}
```

### 1.6 Performance Considerations
- The repository should ensure that the filtered query is efficient. Indexes on `user_id`, `type`, and `updated_at` will help.
- For very large datasets, offset pagination may become slow. If performance degrades, consider moving to cursor‑based pagination using `updated_at` and `id`. However, offset pagination is sufficient for most cases and simpler to implement.

---

## 2. Frontend Changes

### 2.1 Store Modifications (Pinia)
Update the `questionStore` to manage pagination state and support loading additional pages.

**State additions:**
- `questions`: currently an array – will now accumulate items across pages (for infinite scroll) or hold only the current page if using traditional pagination.
- `currentPage` (number) – the last loaded page.
- `pageSize` (number) – the number of items per request.
- `total` (number) – total number of items matching the current filters.
- `hasMore` (boolean) – derived from `questions.length < total` or `currentPage < totalPages`.
- `loading` – already present, will be used to prevent concurrent requests.

**Action modifications:**
- Modify `fetchQuestions` to accept an optional `page` parameter and a flag `append` (default false).
  - If `append` is true, concatenate the new items to the existing list; otherwise replace the list.
- Inside the action, send the pagination parameters (`page`, `pageSize`) along with filters.
- Update the state with the response data: set `items`, `total`, and increment `currentPage` if needed.
- Also store the latest filters to reuse when loading the next page.

**Handling filter changes:**
When any filter (`search`, `type`, `tags`, `mine`) changes, reset pagination (set `currentPage = 1`, clear `questions`) and fetch the first page with `append = false`.

### 2.2 UI Component – QuestionListPage
The current page uses a simple `a-list` that receives all questions. We need to add an infinite scroll mechanism.

**Approach A – Load‑more button**  
- Add a button at the bottom of the list that, when clicked, loads the next page.  
- Show a loading spinner while the next page is being fetched.  
- Hide the button when `hasMore` is false.

**Approach B – Infinite scroll (recommended for mobile)**  
- Use an intersection observer (or a library like `vue‑virtual‑scroller`) to detect when the user scrolls near the bottom.  
- When the sentinel element becomes visible and `hasMore` is true and not already loading, trigger loading of the next page.  
- This provides a seamless experience without requiring a button tap.

Implementation steps for infinite scroll:
1. Add a hidden sentinel `<div ref="loadMoreTrigger" />` at the end of the list.
2. In `onMounted`, create an intersection observer that watches the sentinel. When it intersects, call a method `loadNextPage`.
3. `loadNextPage` checks `hasMore` and `loading`, then calls `questionStore.fetchQuestions` with `page = currentPage + 1` and `append = true`.
4. Ensure that when filters change, the sentinel is reset and the observer re‑attached if necessary.

**UI Feedback**  
- While loading more, show a small spinner or skeleton items at the bottom.  
- If an error occurs during fetching, display a retry option.

### 2.3 Request Parameters
When calling the API, include the pagination parameters:
```
GET /api/question?search=...&type=...&tags=...&mine=...&page=2&pageSize=20
```

The store action should build the query string accordingly.

### 2.4 Edge Cases & Error Handling
- If the user scrolls very fast, multiple `loadNextPage` calls might be triggered. Use a lock (`loading` flag) to prevent concurrent requests.
- When the last page is reached, disable the sentinel observation to avoid unnecessary requests.
- If the API returns an error, show a message and allow the user to retry loading the page.
- Handle the case where the total number of items is less than the page size (no further pages).

---

## 3. Summary of Changes

| Layer        | Component               | Change Summary                                                                                   |
|--------------|-------------------------|--------------------------------------------------------------------------------------------------|
| **Backend**  | Controller              | Accept `page` and `pageSize` query parameters. Return `PaginatedResult<T>`.                     |
|              | Service                 | Accept pagination params and return paginated result.                                           |
|              | Repository              | Add `skip`/`take` parameters, return items + total count.                                       |
|              | DTOs                    | Introduce `PaginatedResult<T>` for consistent API responses.                                    |
| **Frontend** | Store (Pinia)           | Add pagination state (`currentPage`, `total`, `hasMore`). Modify fetch to support appending.    |
|              | QuestionListPage        | Implement infinite scroll (or load‑more button) to fetch additional pages when needed.          |
|              | API client              | Ensure pagination params are sent with every request.                                           |

This design preserves the existing filtering capabilities and seamlessly integrates pagination while maintaining a smooth user experience on mobile devices. The changes are modular and can be implemented incrementally.