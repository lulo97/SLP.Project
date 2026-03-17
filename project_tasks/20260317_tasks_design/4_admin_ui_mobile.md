4. Fix admin ui dashboard table to view on mobile

## Mobile Admin Dashboard Table Redesign

The current admin dashboard uses standard data tables with horizontal scrolling on mobile. While functional, this creates a poor user experience—users must scroll sideways to see all columns, making it hard to scan and act on data. Below is a mobile‑optimized design approach that prioritizes quick actions and essential information while maintaining full functionality.

### Overall Principle

On mobile, we shift from a dense table to a **card‑based list** with progressive disclosure. Each row becomes a card that displays the most critical fields upfront, with secondary details available on tap. Action buttons are always visible and easily tappable.

---

### 1. Users Tab (Mobile View)

**Card layout**  
Each user card shows:
- **Username** (bold, primary identifier)
- **Email** (smaller, truncated if needed)
- **Role & Status** as color‑coded chips
- **Email confirmation** as an icon (✅ verified / ⚠️ unverified)
- **Ban/Unban** button (primary/danger) placed at the bottom right of the card

**Interaction**  
Tapping anywhere on the card (except the action button) opens a **details panel** (slide‑up or modal) with full user information:
- ID
- Created date
- Additional metadata (if any)
- Option to view user’s activity

**Why this works**  
- Key decision points (status, role, ban action) are immediately visible.
- No horizontal scrolling; content flows vertically.
- The ban button is large enough for easy tapping.

---

### 2. Quizzes Tab (Mobile View)

**Card layout**  
Each quiz card shows:
- **Quiz title** (bold)
- **Author username** (secondary)
- **Visibility** (public/private) as an icon + label
- **Disabled/Enabled** status chip
- **Disable/Enable** toggle button (color‑coded)

**Interaction**  
Tap card to expand and see:
- Quiz ID
- Creation date
- Number of questions (if available)
- Link to view quiz details in the regular quiz viewer

**Why this works**  
- Authors and visibility are the most relevant metadata.
- The toggle action is prominent; enabling/disabling a quiz is the primary admin task.

---

### 3. Comments Tab (Mobile View)

**Card layout**  
Each comment card shows:
- **Username** (bold)
- **Content preview** (truncated to 2 lines, with “…”)
- **Target type & ID** (e.g., “Quiz #123”) as a small label
- **Status chip** (Active / Deleted)
- **Delete/Restore** button (danger for delete, primary for restore)

**Interaction**  
Tap card to:
- See full comment text
- View creation/deletion timestamps
- Navigate to the target (quiz/question) if needed

**Why this works**  
- The comment preview helps admins quickly identify inappropriate content.
- The action button is always accessible, even for deleted comments (restore).

---

### 4. Logs Tab (Mobile View)

Logs are inherently dense. A vertical timeline is more readable than a table on mobile.

**Timeline layout**  
Each log entry is presented as a timeline item:
- **Admin name** and **action** on the first line (bold for action)
- **Target type/ID** on the second line
- **Timestamp** on the right (small, monospace)
- A **“details”** icon (ℹ️) if JSON details exist

**Interaction**  
Tap the entry to expand and view the full JSON payload (formatted in a readable way).

**Why this works**  
- Chronological order is natural for logs.
- No need to compare columns horizontally; each entry is self‑contained.

---

### 5. Reports Tab (Mobile View)

Already uses a table, but on mobile it should also convert to cards.

**Card layout**  
Each report card shows:
- **Reporter username** (bold)
- **Target** (e.g., “Comment #456”)
- **Reason preview** (truncated)
- **Created date** (relative, e.g., “2h ago”)
- Action buttons stacked vertically or in a row (Resolve, Delete Comment, Disable Quiz, View)

**Interaction**  
Tap “View” to go to the target. “Resolve” removes the card immediately.

**Why this works**  
- Action buttons are grouped and clearly labeled, avoiding tiny text links.
- The reason preview helps triage reports without expanding.

---

### Responsive Behavior & Implementation Notes

- **Breakpoint**: Switch from table to card layout at ≤768px (typical tablet/mobile).
- **Ant Design Vue components**:  
  - Replace `<a-table>` with `<a-list>` for the card layout.  
  - Use `<a-card>` or custom card component inside `<a-list-item>`.  
  - For actions, use `<a-button>` with appropriate size (`small` on mobile still works but ensure touch target ≥44×44px).
- **Data handling**:  
  - Fetch the same DTOs; no extra API calls needed.  
  - For expandable details, either include all data in the initial fetch or lazy‑load on expansion.
- **Testing**: Ensure all interactive elements have proper `data-testid` attributes for E2E tests.

---

### Comparison: Current vs. Proposed

| Current (Mobile)                     | Proposed (Mobile)                     |
|--------------------------------------|----------------------------------------|
| Horizontal scroll required           | Vertical scroll, no horizontal         |
| Small text buttons, hard to tap      | Larger buttons, easy tapping            |
| All columns visible but cluttered    | Only essential info shown upfront       |
| Actions buried in last column         | Actions always visible on the card      |
| Logs as wide table                   | Logs as readable timeline               |

This design retains all admin functionality while making the interface pleasant and efficient on small screens. The shift to cards also aligns with modern mobile UI patterns (e.g., Gmail, Slack) and can be implemented with minimal backend changes.