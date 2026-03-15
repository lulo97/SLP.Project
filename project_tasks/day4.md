
## Day 4 – Reading System, Explanations, Favorites

**Goal**: Reading view with text selection actions, explanations table, favorites management.

| Time | Task | Details |
|------|------|---------|
| 2h | Database: explanation & progress | Create `explanation`, `user_source_progress` tables. Run migration. |
| 2h | Backend explanation endpoints | `GET /sources/:id/explanations`, `POST /explanations`, `PUT /explanations/:id`, `DELETE /explanations/:id`. |
| 1h | Backend progress endpoints | `GET /sources/:id/progress`, `PUT /sources/:id/progress`. |
| 2h | Frontend: reading view | Build source viewer (rich text rendering). Implement scroll position tracking (save to API debounced). Add “Resume” button. |
| 2h | Text selection bubble | Implement bubble menu on text selection. Actions: Explain (check existing, else queue LLM), Grammar (queue), TTS (queue), Add to Favorites. |
| 1h | Favorites endpoints | `GET /favorites`, `POST /favorites`, `PUT /favorites/:id`, `DELETE /favorites/:id`. |
| 1h | Frontend: favorites page | List, add, edit, delete favorites. Search/filter. |
| 1h | Integrate with bubble | When “Add to Favorites” tapped, open modal with text prefilled. |

**End‑of‑Day Checklist**  
- [ ] Reading view displays source content.  
- [ ] Progress saved and restored.  
- [ ] Text selection bubble appears with icons.  
- [ ] Explanations can be added/viewed (mock LLM).  
- [ ] Favorites CRUD works.  
- [ ] Grammar check and TTS actions trigger API calls (queued).
