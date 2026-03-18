1. User need to see a page report their submit
- If report has not been resolve by admin then user can delete
- If report has been resolve by admin then user can only view the report

## Feature Design: User Reports Page

### 1. Overview
This feature allows users to view a list of reports they have submitted. Users can:
- **Delete** their own report if it has **not been resolved** by an admin.
- **View** the report details (including resolution information) if it has been resolved.

The design integrates with the existing `report` table, backend services, and frontend components.

---

### 2. Database Considerations
No schema changes are required. The existing `report` table already contains:
- `user_id` (reporter)
- `resolved` (boolean)
- `resolved_by`, `resolved_at` (optional, filled when resolved)
- `target_type`, `target_id`, `reason`, `created_at`

For delete operations, we will perform a **hard delete** (remove the row). This is acceptable because:
- Users can withdraw unresolved reports, and they should no longer appear in admin queues.
- Resolved reports cannot be deleted, so history for resolved items is preserved.
- No need for soft delete; admin logs already track resolution actions.

---

### 3. Backend API Endpoints

#### 3.1. Get Current User’s Reports
- **Endpoint:** `GET /api/user/reports`
- **Authentication:** Required (user role)
- **Response:** Array of `ReportDto` objects (same as used in admin, but may include additional fields like `resolvedByUsername`).
- **Behavior:** Returns all reports belonging to the authenticated user, ordered by `created_at DESC`.

#### 3.2. Get Single Report by ID
- **Endpoint:** `GET /api/user/reports/{id}`
- **Authentication:** Required
- **Authorization:** Ensure `report.user_id == currentUserId`
- **Response:** Full `ReportDto` with navigation properties (reporter username, resolver username if resolved).

#### 3.3. Delete Unresolved Report
- **Endpoint:** `DELETE /api/user/reports/{id}`
- **Authentication:** Required
- **Authorization:** Must satisfy:
  - Report exists and belongs to current user.
  - `resolved == false`
- **Response:** `204 No Content` on success, `404` if not found, `403` if forbidden, `409` if already resolved.
- **Implementation:** Remove the report record from database. Optionally log this action (e.g., as a user action, not admin log).

---

### 4. Frontend Design

#### 4.1. New Route
Add a route under the authenticated user section:
- Path: `/my-reports`
- Component: `UserReports.vue`
- Navigation: Add link in user dropdown menu (e.g., "My Reports").

#### 4.2. UserReports.vue Component
**Purpose:** Display a list of reports submitted by the logged-in user, with appropriate actions.

**Layout:**
- Title: “My Reports”
- A table (Ant Design `a-table`) with columns:
  - **ID** (optional)
  - **Target** (e.g., “Quiz #123”)
  - **Reason** (truncated with tooltip)
  - **Status** (Resolved / Unresolved) – use a tag
  - **Created At** (formatted)
  - **Actions** (buttons: View, Delete if unresolved)

**Behavior:**
- On mount, fetch reports via `GET /user/reports`.
- Show loading spinner while fetching.
- If no reports, display empty state message.
- **View action:** Opens a modal (or navigates to a detail page) showing full report details, including resolution info (resolved at, resolved by admin) if resolved.
- **Delete action:**
  - Show a popconfirm to confirm deletion.
  - On confirm, call `DELETE /user/reports/{id}`.
  - On success, remove the report from the list and show success message.
  - If deletion fails (e.g., report was already resolved in the meantime), show error and refresh the list.

**Example Table Columns Configuration:**
```ts
const columns = [
  { title: 'Target', key: 'target' },
  { title: 'Reason', key: 'reason' },
  { title: 'Status', key: 'status' },
  { title: 'Created', key: 'createdAt' },
  { title: 'Actions', key: 'actions' }
];
```

**Sample Template Snippet:**
```html
<a-table :data-source="reports" :columns="columns" row-key="id">
  <template #bodyCell="{ column, record }">
    <template v-if="column.key === 'target'">
      {{ record.targetType }} #{{ record.targetId }}
    </template>
    <template v-else-if="column.key === 'reason'">
      <a-tooltip :title="record.reason">
        {{ truncate(record.reason, 50) }}
      </a-tooltip>
    </template>
    <template v-else-if="column.key === 'status'">
      <a-tag :color="record.resolved ? 'green' : 'orange'">
        {{ record.resolved ? 'Resolved' : 'Unresolved' }}
      </a-tag>
    </template>
    <template v-else-if="column.key === 'actions'">
      <a-button size="small" @click="viewReport(record)">View</a-button>
      <a-popconfirm
        v-if="!record.resolved"
        title="Delete this report?"
        @confirm="deleteReport(record.id)"
      >
        <a-button size="small" danger>Delete</a-button>
      </a-popconfirm>
    </template>
  </template>
</a-table>
```

#### 4.3. Report Detail Modal/Page
- A modal (`a-modal`) that shows:
  - Target type and ID
  - Reason (full text)
  - Status
  - If resolved: resolved at timestamp and admin username
  - Created at timestamp
- Accessible via “View” button in the table.

#### 4.4. State Management
Create a new Pinia store: `useUserReportsStore` (or extend an existing user store) with:
- State: `reports`, `loading`, `error`
- Actions:
  - `fetchReports()`
  - `fetchReportById(id)`
  - `deleteReport(id)`

Keep the store lean; API calls can be made directly in the component if preferred, but using a store promotes reusability.

---

### 5. Security & Validation
- All endpoints must require authentication.
- For `DELETE`, verify:
  - Report exists.
  - `report.user_id == currentUserId`.
  - `report.resolved == false`.
- Return appropriate HTTP status codes:
  - `200` / `204` on success.
  - `400` if trying to delete a resolved report.
  - `403` if not owner.
  - `404` if report not found.

---

### 6. Testing Considerations
- **Unit Tests:** Backend: test authorization logic, delete constraints.
- **Integration Tests:** Verify that a user can delete only their own unresolved reports.
- **Frontend Tests:**
  - Render empty state correctly.
  - Display both resolved and unresolved reports.
  - Clicking delete triggers popconfirm and API call.
  - View button opens modal with correct details.

---

### 7. Potential Enhancements (Future)
- Allow users to edit the reason before resolution? (Not in current scope.)
- Show a confirmation message when a report is resolved (e.g., “Your report has been resolved”).
- Add pagination if users have many reports.

---

### 8. Integration with Existing Code
- The existing `ReportService` and `ReportRepository` can be extended with methods:
  - `GetByUserIdAsync(int userId)`
  - `DeleteAsync(int id)` (with ownership check)
- The `ReportController` should have new actions under a `[Authorize]` attribute, possibly grouped under `api/user/reports` to separate from admin endpoints.
- Frontend can reuse `ReportDto` shape; add optional `resolverName` field if needed.

This design leverages the current schema and codebase, minimizing changes while delivering the required functionality.