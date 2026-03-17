http://localhost:3002/search Implement pagination (current show infinite)

We need to design a transition from **infinite scroll** to **explicit pagination** for the search feature at `/search`.  
From the provided code, the backend already supports pagination for single-type searches (`quiz`, `question`, `source`, `favorite`), while the `all` tab returns only the first page (by design).  
The frontend store and template already include pagination primitives (`page`, `totalPages`, `<a-pagination>`), but the user indicates the current behaviour is infinite scroll – likely there is additional code (e.g., an `IntersectionObserver`) that loads more results as the user scrolls.  

Our design will remove the infinite‑scroll logic and fully adopt server‑side pagination with traditional page controls.  
Below is a high‑level architecture plan covering **frontend**, **backend**, and **user experience**.

---

## 1. Backend – No Breaking Changes Needed

The current backend is already pagination‑ready for all **single‑type** searches:

- `SearchService.SearchSingleTypeAsync` returns properly paginated results using `OFFSET`/`LIMIT` and provides `TotalCount` and `TotalPages`.
- The `all` tab returns a merged, **non‑paginated** top‑N list (page = 1, totalPages = 1).  
  This is intentional – the “All” view is meant as a quick overview; users are expected to drill down to a specific type for deeper browsing.

### Optional Enhancement (if pagination for “All” is required)

If the product demands pagination on the “All” tab as well, a more complex solution is needed:

- The backend would have to perform a **union** of all four category queries, each fetching enough rows to satisfy the overall offset/limit.  
- This can be done by:
  1. Running each category query with `OFFSET`/`LIMIT` calculated proportionally based on category counts, or
  2. Using a **keyset pagination** approach with a materialized view.  
- However, this adds significant complexity and database load.  
  **Recommendation:** Keep “All” as a limited preview (20 results) and rely on the tabs for full pagination.  
  If analytics show users often want more than 20 results in “All”, revisit later.

---

## 2. Frontend – Replace Infinite Scroll with Pagination

### Current Code Overview

- `searchStore.ts` already manages `page`, `pageSize`, `totalPages`, and provides `setPage(page)` which triggers a new search.
- `SearchPage.vue` already contains a `<a-pagination>` component, but it is probably disabled or hidden because infinite‑scroll logic is active.
- The infinite‑scroll implementation (likely an observer in a wrapper or a separate composable) must be identified and removed.

### Step‑by‑Step Frontend Changes

#### a. Remove Infinite‑Scroll Code

- Locate the component/composable that listens to scroll events and appends results (e.g., a `useInfiniteScroll` hook or an `IntersectionObserver` in `SearchPage.vue`).  
- Delete that code entirely – the store should no longer accumulate results by pushing new items onto the existing array.

#### b. Adapt the Store for “Replace” Semantics

The store currently sets `this.results = data.results` on each search – this is correct for pagination (the results array is replaced with the new page).  
No change needed.

#### c. Enable the Pagination Component

- Ensure the `<a-pagination>` is **uncommented** and correctly bound to store properties:
  ```vue
  <a-pagination
    v-model:current="searchStore.page"
    :total="searchStore.totalCount"
    :page-size="searchStore.pageSize"
    :show-size-changer="false"
    size="small"
    @change="searchStore.setPage"
  />
  ```
- Add a `v-if` condition to hide pagination when `searchStore.totalPages <= 1` (already present).

#### d. Handle Page Reset on New Search

The store already resets `page` to `1` in `search(resetPage)` when the query changes or when switching tabs.  
Verify that `setType` also resets the page – it currently sets `this.page = 1` and calls `this.search()`. Good.

#### e. Loading States for Page Changes

- The store’s `loading` flag is already used to show skeletons.  
- When the user clicks a pagination button, `searchStore.loading` becomes `true`, and the skeleton appears.  
- To improve perceived performance, consider adding a **small spinner near the pagination controls** while loading a new page (optional).

#### f. URL Synchronisation (Optional but Recommended)

To make paginated results shareable/bookmarkable, update the URL query parameters when the page changes:

- In `SearchPage.vue`, watch `searchStore.page` and push a new route query:  
  `router.push({ query: { ...route.query, page: searchStore.page } })`
- On component mount, read `route.query.page` and initialise the store’s page.

#### g. Page Size Selector (Optional)

If users may want to change the number of results per page, add a dropdown (e.g., 10, 20, 50) that updates `searchStore.pageSize` and triggers a search (resetting to page 1).  
The backend already respects `pageSize` (capped at 50).

---

## 3. User Experience Considerations

### Pagination Placement

- The current design places pagination **below the results list**. This is intuitive for desktop and large mobile screens.
- On very small screens, pagination buttons may be hard to tap; consider using a “Load more” button instead of page numbers?  
  But the user explicitly wants pagination, so we keep numbers.

### Empty States & Error Handling

- Already handled by the existing template (`a-alert`, “No results found”).
- Ensure that when the user navigates to a page beyond the available results (e.g., by manually editing the URL), the store correctly fetches page 1 or shows a 404‑like message.

### Transition from Infinite Scroll to Pagination

- Users accustomed to infinite scroll may find pagination jarring.  
- Add a subtle **scroll‑to‑top** behaviour when changing pages (e.g., `window.scrollTo({ top: 0, behavior: 'smooth' })` inside `setPage`).

---

## 4. Testing & Edge Cases

- **Tab switching** – verify that page resets to 1.
- **New search query** – page resets to 1.
- **Last page** – pagination component should disable the “next” button automatically (Ant Design handles this).
- **No results** – pagination should be hidden.
- **Large page numbers** – ensure `totalPages` is correctly calculated and displayed.
- **Concurrent requests** – if the user rapidly clicks pagination buttons, cancel previous in‑flight requests (Axios cancel tokens or AbortController).  
  The current store doesn’t implement cancellation – consider adding it to avoid race conditions.

---

## 5. Summary of Architectural Changes

| Area          | Change                                                                 |
|---------------|------------------------------------------------------------------------|
| **Backend**   | No changes required. Pagination already implemented for single types. |
| **Frontend**  | - Remove infinite‑scroll observer/composable.<br>- Enable existing `<a-pagination>`.<br>- (Optional) Add URL sync and page‑size selector.<br>- Ensure loading states and scroll‑to‑top on page change. |
| **Store**     | Already suitable; consider adding request cancellation.               |
| **UX**        | Smooth transition by scrolling to top; maintain clear visual feedback. |

This design leverages the existing server‑side pagination while completely removing the client‑side infinite‑scroll logic. The result is a predictable, performant search experience with clear navigation controls.