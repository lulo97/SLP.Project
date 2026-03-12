## Day 2 – Quizzes, Questions & Sources (Backend)

**Goal**: Complete backend CRUD for quizzes, questions (bank), sources; frontend list views and creation forms.

| Time | Task | Details |
|------|------|---------|
| 3h | Database models & migrations | Create tables: `source`, `question`, `quiz`, `quiz_source`, `quiz_note`, `quiz_question`, `tag`, `quiz_tag`, `question_tag`. Add indexes and foreign keys. Run migration. |
| 3h | Quiz & question endpoints | Implement `GET /quizzes`, `POST /quizzes`, `GET /quizzes/:id`, `PUT /quizzes/:id`, `DELETE /quizzes/:id` (soft delete admin only), `POST /quizzes/:id/duplicate`. Include tag handling. |
| 2h | Question bank endpoints | `GET /questions`, `POST /questions`, `GET /questions/:id`, `PUT /questions/:id`, `DELETE /questions/:id` (soft delete). Support filtering by type/tag/search. |
| 2h | Source endpoints | `POST /sources` (multipart/form‑data), `GET /sources/:id`, `DELETE /sources/:id` (soft delete). Integrate PDF/TXT extraction via a simple local service (or mock for now). |
| 2h | Frontend: quiz list & creation | Build quiz list page (tabs: My Quizzes / Public). Add “Create Quiz” form (basic info only, no questions yet). |
| 1h | Frontend: question bank list | Build question list with filters. Add “New Question” modal (basic fields). |

**End‑of‑Day Checklist**  
- [ ] All new tables created in DB.  
- [ ] Quiz CRUD works (create, read, update, duplicate).  
- [ ] Question bank CRUD works (create, edit, delete).  
- [ ] Source upload works (store file, return metadata).  
- [ ] Frontend can list quizzes and questions.  
- [ ] Frontend can create a quiz (without questions) and a question.