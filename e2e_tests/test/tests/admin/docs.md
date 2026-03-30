Below are end-to-end (E2E) test scenarios for the admin features, based on the provided backend and frontend code. The scenarios assume a testing framework like **Cypress** or **Playwright**, and focus on the admin panel’s critical workflows, edge cases, and permission handling.

---

## 🔐 Authentication & Authorization

1. **Non‑admin access is blocked**
   - Log in as a regular user.
   - Attempt to visit `/admin` routes (e.g., `/admin/users`, `/admin/metrics`).
   - **Expect:** Redirect to login or receive a 403/404 response; admin UI not shown.

2. **Admin role is required**
   - Log in as an admin.
   - Access all admin pages (users, quizzes, comments, logs, health, metrics).
   - **Expect:** Pages load and API calls succeed.

---

## 👥 User Management

### 3. View list of users
- Admin navigates to **Users** tab.
- **Expect:** Table (desktop) or card list (mobile) displays all users with correct fields: ID, username, email, role, status, email confirmed, creation date.

### 4. Search users
- Type partial username in search box.
- **Expect:** List filters to show only matching users.

### 5. Ban a user (happy path)
- Select an **active** user (non‑admin).
- Click **Ban** and confirm.
- **Expect:**
  - Success message.
  - User status changes to `banned` in the list.
  - Admin logs contain an entry with action `ban_user`.
  - The banned user’s sessions are revoked (if logged in, they get logged out).

### 6. Unban a user
- Select a **banned** user.
- Click **Unban** and confirm.
- **Expect:** Status changes to `active`, log entry `unban_user`.

### 7. Cannot ban admin user
- Attempt to ban a user with role `admin`.
- **Expect:** API returns `400 Bad Request`; UI shows error message “Cannot ban admin”.

### 8. Ban/unban from mobile view
- On a mobile viewport (≤768px), find a user card, tap the action button, confirm.
- **Expect:** Same behavior as desktop; touch‑friendly buttons (min height 44px).

---

## 📚 Quiz Management

### 9. View list of quizzes
- Navigate to **Quizzes** tab.
- **Expect:** Table/cards show quiz ID, title, owner username, visibility (public/private), enabled/disabled status, creation date.

### 10. Search quizzes
- Type title or owner username into search box.
- **Expect:** Filtering works.

### 11. Disable a quiz
- Select an **enabled** quiz.
- Click **Disable** and confirm.
- **Expect:**
  - Status changes to `Disabled` (tag turns red).
  - Log entry `disable_quiz`.
  - The quiz is no longer visible to regular users (separate integration test recommended).

### 12. Enable a quiz
- Select a **disabled** quiz.
- Click **Enable** and confirm.
- **Expect:** Status changes to `Enabled`, log entry `enable_quiz`.

### 13. Disable/enable from mobile
- Repeat scenarios 11 and 12 on mobile view; verify touch target and functionality.

---

## 💬 Comment Management

### 14. View all comments
- Go to **Comments** tab.
- **Expect:** List shows comment ID, username, content, target type/ID, status (active/deleted), creation date.

### 15. Toggle “Show deleted”
- Uncheck “Show deleted”.
- **Expect:** Only active comments appear.
- Check it again.
- **Expect:** Deleted comments reappear with “Deleted” tag.

### 16. Delete a comment
- On an active comment, click **Delete** and confirm.
- **Expect:**
  - Success message.
  - Comment now shows “Deleted” tag (or disappears if “Show deleted” is off).
  - Log entry `delete_comment`.

### 17. Restore a comment
- Show deleted comments, locate a deleted comment.
- Click **Restore** and confirm.
- **Expect:** Status changes to active, log entry `restore_comment`.

### 18. Delete/restore from mobile
- Test both actions on mobile view.

---

## 📜 Admin Logs

### 19. View recent logs
- Go to **Logs** tab.
- **Expect:** Table/cards show log entries: ID, admin name, action, target type/ID, creation date.

### 20. Logs appear after admin actions
- Perform any admin action (ban, disable, delete, etc.).
- Refresh logs.
- **Expect:** A new log entry appears with correct admin name and action details.

---

## 🩺 Health Dashboard

### 21. View system health status
- Navigate to **Health** page (likely a separate route; code shows `AdminHealthPage.vue`).
- **Expect:**
  - Table of services (Redis, Mail, Backend, Frontend, Llama, Piper Gateway) with status (Healthy/Degraded/Unhealthy), details, response time.
  - “Last updated” timestamp.

### 22. Refresh health status
- Click the **Refresh** button.
- **Expect:** Loading spinner appears, data reloads with updated timestamp.

### 23. Handle health check timeouts
- Simulate a slow external service (e.g., stop Redis).
- **Expect:** Service status shows “Unhealthy” with details “Timeout after 3 seconds” and response time ≈3000 ms.

---

## 📊 Metrics

### 24. View metrics page
- Navigate to **Metrics** page.
- **Expect:** Page shows:
  - Time range controls (presets: Last 1h, 6h, 24h; custom range picker).
  - Summary cards: Total Requests, Total Errors, Avg Latency, p95 Latency.
  - Charts for requests/min, errors/min, latency (avg and p95).

### 25. Change time range
- Click “Last 6h” preset.
- **Expect:** Charts update to show data from last 6 hours.
- Use date picker to select a custom range.
- **Expect:** Data refreshes accordingly.

### 26. Refresh metrics
- Click **Refresh** button.
- **Expect:** Loading spinners appear, data reloaded.

### 27. Empty state
- Pick a time range with no metrics data.
- **Expect:** Each chart shows “No data for this period” placeholder.

### 28. Loading states
- While metrics are loading, each chart area shows a spinner.
- After loading, charts render with data.

### 29. Error rate calculation
- Verify that error rate percentage in summary card matches calculated from requests and errors data shown in charts.

---

## 🔧 Edge Cases & Negative Scenarios

### 30. API failure handling
- Simulate a network error or backend failure (e.g., stop backend, return 500).
- **Expect:** User sees a friendly error message (e.g., “Failed to load users”), UI doesn’t crash.

### 31. Concurrent admin actions
- Two admins try to ban the same user simultaneously.
- **Expect:** One succeeds, the other receives a conflict/error message; data remains consistent.

### 32. Very long data
- Insert a comment with extremely long content.
- **Expect:** Table truncates content with ellipsis; mobile card uses line clamping.

### 33. Pagination / infinite scroll (if implemented)
- If the number of users/quizzes/logs exceeds the default count, test navigation.

---

## 📱 Responsive Design

### 34. Desktop view
- At viewport width >768px, verify tables are displayed with appropriate columns.

### 35. Mobile view
- At width ≤768px, verify:
  - Tables are replaced by card layouts.
  - All buttons are touch‑friendly (≥44px height/width).
  - Cards contain all relevant fields.
  - Actions are still accessible.

---

## 🔄 State Persistence

### 36. Tab persistence
- Switch tabs (e.g., from Users to Quizzes), then back.
- **Expect:** Previous data is retained (no re‑fetch unless refresh triggered).

### 37. Search persistence
- Apply a search filter in Users, switch to Quizzes, then return to Users.
- **Expect:** Search term and filtered list are still there.

---

## 📝 Test Data Setup

- Use a test database with known users, quizzes, comments, and logs.
- Ensure there is at least one admin user and one regular user.
- Pre‑populate metrics data via simulated requests or a seed script.

---

## 🛠 Implementation Notes

- Use `data-testid` attributes from the provided code to target elements reliably.
- For API assertions, you can intercept requests and verify they carry the correct JWT token (admin role).
- For mobile testing, use viewport resizing or device emulation.

These scenarios cover the essential functionality of the admin panel and should form the basis of a comprehensive E2E test suite.