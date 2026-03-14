## Day 3 – Quiz Attempts & Player UI

**Goal**: Implement quiz attempt logic (snapshots, answers, submission) and the quiz player frontend.

| Time | Task | Details |
|------|------|---------|
| 2h | Database: attempt tables | Create `quiz_attempt`, `quiz_attempt_answer`. Run migration. |
| 3h | Backend attempt endpoints | `POST /quizzes/:id/attempts` (starts attempt, creates answer rows with snapshots), `GET /attempts/:id`, `POST /attempts/:id/answers`, `POST /attempts/:id/submit`, `GET /attempts/:id/review`. |
| 3h | Frontend: quiz player | Build player component: question display, answer input (based on type), navigation sidebar, auto‑save (debounced), submit modal. Integrate with attempt API. |
| 2h | Frontend: review page | Show attempt results: score, each question with user answer and correct answer, explanations. |
| 1h | Edge cases | Handle abandoned attempts (auto‑abandon after 24h – simulate by checking `start_time`). Add resume functionality. |
| 1h | Integration | Connect quiz detail page to “Start” button; after submit redirect to review. |

**End‑of‑Day Checklist**  
- [ ] Attempts can be started, answered, and submitted.  
- [ ] Snapshots store question data correctly.  
- [ ] Player works for all question types.  
- [ ] Review page displays correct info.  
- [ ] Auto‑abandon works (manually test by editing DB).  
- [ ] Frontend quiz detail shows attempt history.
