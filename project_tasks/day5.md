## Day 5 – Search & Tagging

**Goal**: global search, tag cloud, and polish.

| 2h | Full‑text search | Add GIN indexes in PostgreSQL. Implement `GET /search` endpoint that searches quizzes, sources, questions, favorites. Return paginated mixed results. |
| 1h | Frontend: search UI | Build search page with tabs for each type. Highlight matches. |
| 1h | Tagging | Implement `GET /tags` (list with usage). Frontend tag cloud / autocomplete. |

**End‑of‑Day Checklist**  
- [ ] Search returns correct results across all types.  
- [ ] Tags endpoint works; frontend displays tag list.  
