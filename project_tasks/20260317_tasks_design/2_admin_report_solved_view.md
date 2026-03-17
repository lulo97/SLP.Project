2. Admin need to see a report has been resolve by them (can undo action if resolve mistake)

**Design Overview**

We need to extend the admin reports interface so that resolved reports remain visible and can be undone if resolved by mistake. The existing system already logs resolutions in `admin_log`, but resolved reports are hidden from the default list. The following design outlines the necessary backend and frontend changes to support viewing resolved reports and undoing a resolution.

---

### 1. Backend Modifications

#### 1.1. Report Repository (`IReportRepository` / `ReportRepository`)

Add methods to fetch resolved reports and to undo a resolution.

- **`Task<IEnumerable<Report>> GetResolvedAsync()`** – returns all resolved reports, ordered by `resolved_at` descending.
- **`Task<bool> UndoResolveAsync(int reportId)`** – sets `resolved = false`, `resolved_by = null`, `resolved_at = null`. Returns `true` if the report existed and was resolved; otherwise `false`.

#### 1.2. Report Service (`IReportService` / `ReportService`)

Expose the new repository methods and handle logging.

- **`Task<IEnumerable<ReportDto>> GetResolvedAsync()`** – maps resolved reports to DTOs.
- **`Task<bool> UndoResolveAsync(int adminId, int reportId)`**  
  - Calls `_reportRepo.UndoResolveAsync(reportId)`.  
  - If successful, logs an admin action with `Action = "undo_resolve_report"`, `TargetType = "report"`, `TargetId = reportId`.  
  - Returns the result.

#### 1.3. Report Controller (`ReportController`)

Add two new endpoints (keeping existing ones unchanged).

- **`GET /api/reports/resolved`** – returns the list of resolved reports.  
  *(Alternatively, modify the existing `GET /api/reports` to accept a query parameter `?resolved=true|false`, defaulting to `false` for backward compatibility. Choose whichever fits your API style.)*
- **`POST /api/reports/{id}/undo-resolve`** – calls the service method. Returns `200 OK` on success, `404 Not Found` if the report does not exist or is not resolved.

Both endpoints must remain `[Authorize(Roles = "admin")]`.

#### 1.4. Admin Log

No changes needed – the new `undo_resolve_report` action will be stored in the existing `admin_log` table, joining the audit trail.

---

### 2. Frontend Modifications

#### 2.1. Admin Reports Component (`AdminReports.vue`)

Enhance the UI to show both unresolved and resolved reports in separate tabs.

- **Tabs** – Add a tab bar with two options: *Unresolved* (default) and *Resolved*.  
  - Use `a-tabs` or a simple button group to switch between the two views.
- **Unresolved Tab** – Keep the existing table with resolve and action buttons.
- **Resolved Tab** – Display a table with columns:  
  `ID`, `Reporter`, `Target`, `Reason`, `Resolved By` (admin username), `Resolved At`, and an **Undo** button.  
  - Fetch data from the new `GET /api/reports/resolved` endpoint.  
  - The **Undo** button triggers a `POST /api/reports/{id}/undo-resolve` with a confirmation popconfirm (e.g., “Undo resolution? This report will be marked unresolved again.”).  
  - After a successful undo, refresh the resolved list (or remove that row) and optionally show a success message.

- **Loading states** – Maintain separate loading indicators for unresolved and resolved lists.

#### 2.2. Admin Store (`adminStore.ts`)

Add actions to fetch resolved reports and to undo a resolution. These can be placed in a dedicated report store or added to the existing admin store for simplicity.

- **`fetchResolvedReports()`** – calls the new `GET /api/reports/resolved`.
- **`undoResolveReport(reportId)`** – calls `POST /api/reports/{id}/undo-resolve` and then refreshes the resolved list.

#### 2.3. Types

Add a `ResolvedReportDto` type (or reuse `ReportDto` with additional fields like `resolvedByUsername` and `resolvedAt`). Ensure the DTO includes the resolver’s name.

---

### 3. User Experience Flow

1. An admin navigates to the **Reports** tab in the admin panel.
2. By default, they see the **Unresolved** list (same as before).
3. They can click the **Resolved** tab to view all reports that have been resolved, including those resolved by any admin.
4. In the resolved list, each row shows who resolved it and when, with an **Undo** button.
5. Clicking **Undo** prompts a confirmation. If confirmed, the report is immediately moved back to the unresolved list (the resolved tab refreshes, and the unresolved tab now includes it).
6. The undo action is recorded in the admin log with the action `undo_resolve_report`, providing a full audit trail.

---

### 4. Considerations

- **Permissions** – Undo should be allowed for any admin, not just the original resolver. This simplifies the design and is acceptable for most admin panels.
- **Race conditions** – If two admins attempt to resolve/undo the same report simultaneously, the last write wins. This is acceptable; the system remains consistent.
- **Logging** – The `details` field in `admin_log` could optionally store the previous state (e.g., a JSON object with `resolved_by` and `resolved_at`), but it is not strictly necessary.
- **Performance** – If the number of resolved reports grows large, consider adding pagination to the `GET /resolved` endpoint and implementing it in the frontend table.

This design integrates seamlessly with the existing architecture and provides admins with full visibility and control over report resolutions, including the ability to correct mistakes.