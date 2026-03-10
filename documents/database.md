# Self Learning Platform – Database Design

## Core Tables

### `users`
| Column            | Type           | Modifiers                                      | Description |
|-------------------|----------------|------------------------------------------------|-------------|
| id                | SERIAL         | PRIMARY KEY                                    | Unique user ID |
| username          | VARCHAR(50)    | NOT NULL UNIQUE                                | Immutable after creation |
| password_hash     | VARCHAR(255)   | NOT NULL                                       | Argon2id hash |
| email             | VARCHAR(255)   | UNIQUE                                         | Optional, immutable once confirmed |
| email_confirmed   | BOOLEAN        | NOT NULL DEFAULT false                         | |
| role              | VARCHAR(20)    | NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')) | |
| status            | VARCHAR(20)    | NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')) | Banned users cannot log in |
| created_at        | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at        | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `username`, `email` (unique), `status`.

### `password_reset_tokens`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| token         | VARCHAR(64)    | NOT NULL UNIQUE                                | Secure random token |
| expires_at    | TIMESTAMPTZ    | NOT NULL                                       | 30 minutes from creation |
| used          | BOOLEAN        | NOT NULL DEFAULT false                         | |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `token`, `user_id`, `expires_at`.

### `email_verification_otps`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| otp           | CHAR(6)        | NOT NULL                                       | 6-digit code |
| expires_at    | TIMESTAMPTZ    | NOT NULL                                       | 10 minutes |
| attempts      | INTEGER        | NOT NULL DEFAULT 0                             | Count attempts for this OTP |
| resent_count  | INTEGER        | NOT NULL DEFAULT 0                             | Count resends (within expiry) |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| used_at       | TIMESTAMPTZ    |                                                | When successfully used |

**Indexes**: `user_id` (unique for active? We'll allow multiple, but we can clean up expired). Better to have a unique constraint on `(user_id, used_at)`? Not needed. We'll rely on application to enforce max resends/attempts.

## Content Tables

### `source`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Owner |
| type          | VARCHAR(20)    | NOT NULL CHECK (type IN ('book','link','note','pdf','txt')) | |
| title         | VARCHAR(255)   | NOT NULL                                       | |
| url           | TEXT           |                                                | For 'link' type |
| content       | JSONB          |                                                | Rich text (TipTap JSON) |
| raw_html      | TEXT           |                                                | Original HTML (if imported) |
| raw_text      | TEXT           |                                                | Extracted plain text (for search) |
| file_path     | TEXT           |                                                | Path to uploaded file (PDF/TXT) |
| metadata      | JSONB          |                                                | Additional metadata (e.g., author, page count) |
| deleted_at    | TIMESTAMPTZ    |                                                | Soft delete flag |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `user_id`, `deleted_at` (partial for active sources), GIN on `raw_text` for full‑text search, GIN on `metadata`.

### `note`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| title         | VARCHAR(255)   | NOT NULL                                       | |
| content       | TEXT           | NOT NULL                                       | Markdown or rich text? We'll use TEXT for now. |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `user_id`.

### `quiz`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Creator |
| title         | VARCHAR(255)   | NOT NULL                                       | |
| description   | TEXT           |                                                | |
| visibility    | VARCHAR(20)    | NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')) | |
| disabled      | BOOLEAN        | NOT NULL DEFAULT false                         | Admin‑disabled; blocks new attempts |
| note_id       | INTEGER        | REFERENCES note(id) ON DELETE SET NULL         | Optional associated note |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `user_id`, `visibility`, `disabled`, `created_at`.

### `quiz_source`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| quiz_id       | INTEGER        | REFERENCES quiz(id) ON DELETE CASCADE          | |
| source_id     | INTEGER        | REFERENCES source(id) ON DELETE CASCADE        | |
| PRIMARY KEY (quiz_id, source_id) |           |                                                | |

**Indexes**: `source_id` (for reverse lookup).

### `quiz_note`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| quiz_id       | INTEGER        | REFERENCES quiz(id) ON DELETE CASCADE          | |
| note_id       | INTEGER        | REFERENCES note(id) ON DELETE CASCADE          | |
| PRIMARY KEY (quiz_id, note_id) |           |                                                | |

**Indexes**: `note_id`.

## Question System

### `question` (bank)
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Creator |
| type          | VARCHAR(20)    | NOT NULL CHECK (type IN ('multiple_choice','single_choice','fill_blank','ordering','matching','true_false','flashcard')) | |
| content       | TEXT           | NOT NULL                                       | Question text/prompt |
| explanation   | TEXT           |                                                | Optional explanation |
| metadata      | JSONB          | NOT NULL                                       | Type‑specific data (options, answers, etc.) |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `user_id`, `type`, GIN on `metadata`, GIN on `content` for full‑text search.

### `quiz_question`
| Column              | Type           | Modifiers                                      | Description |
|---------------------|----------------|------------------------------------------------|-------------|
| id                  | SERIAL         | PRIMARY KEY                                    | Surrogate key for ordering and stable references |
| quiz_id             | INTEGER        | NOT NULL REFERENCES quiz(id) ON DELETE CASCADE | |
| original_question_id| INTEGER        | REFERENCES question(id) ON DELETE SET NULL     | Reference to bank question (if any) |
| question_snapshot   | JSONB          | NOT NULL                                       | Cloned question data (type, content, explanation, metadata) |
| display_order       | INTEGER        | NOT NULL                                       | Order within quiz |
| created_at          | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at          | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `quiz_id`, `original_question_id`, `display_order`.  
**Note**: The snapshot preserves the question as it was at creation time, allowing edits to bank without breaking old attempts.

## Quiz Attempts

### `quiz_attempt`
| Column         | Type           | Modifiers                                      | Description |
|----------------|----------------|------------------------------------------------|-------------|
| id             | SERIAL         | PRIMARY KEY                                    | |
| user_id        | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| quiz_id        | INTEGER        | NOT NULL REFERENCES quiz(id) ON DELETE CASCADE | |
| start_time     | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| end_time       | TIMESTAMPTZ    |                                                | When submitted or abandoned |
| score          | INTEGER        |                                                | Number of correct answers |
| max_score      | INTEGER        | NOT NULL                                       | Total questions in attempt |
| question_count | INTEGER        | NOT NULL                                       | Should equal max_score |
| status         | VARCHAR(20)    | NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')) | |
| created_at     | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at     | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `user_id`, `quiz_id`, `status`, `start_time`.  
**Note**: Unfinished attempts auto‑abandoned after 24h (handled by application).

### `quiz_attempt_answer`
| Column            | Type           | Modifiers                                      | Description |
|-------------------|----------------|------------------------------------------------|-------------|
| id                | SERIAL         | PRIMARY KEY                                    | |
| attempt_id        | INTEGER        | NOT NULL REFERENCES quiz_attempt(id) ON DELETE CASCADE | |
| quiz_question_id  | INTEGER        | NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE | The specific question snapshot instance |
| question_snapshot | JSONB          | NOT NULL                                       | Redundant snapshot for safety (or we can join quiz_question) |
| answer_json       | JSONB          | NOT NULL                                       | User's answer (format depends on question type) |
| is_correct        | BOOLEAN        |                                                | Null if not yet scored? But we score per question; after submission, set. |
| created_at        | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at        | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `attempt_id`, `quiz_question_id`.  
**Note**: `question_snapshot` could be omitted if we always join `quiz_question`, but storing it ensures historical integrity if quiz_question is ever updated (though quiz_question itself is a snapshot, so it's immutable). We'll keep it for clarity.

## Favorites & Reading

### `favorite_item`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| text          | TEXT           | NOT NULL                                       | The word/phrase/idiom |
| type          | VARCHAR(20)    | NOT NULL DEFAULT 'word' CHECK (type IN ('word','phrase','idiom','other')) | |
| note          | TEXT           |                                                | Personal note |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `user_id`, GIN on `text` for full‑text search.

### `user_source_progress`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| source_id     | INTEGER        | NOT NULL REFERENCES source(id) ON DELETE CASCADE | |
| last_position | TEXT           |                                                | Opaque position indicator (e.g., paragraph index or character offset) |
| updated_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| UNIQUE (user_id, source_id) |           |                                                | |

**Indexes**: `user_id`, `source_id`.

### `explanation`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | REFERENCES users(id) ON DELETE SET NULL        | NULL if system‑generated |
| source_id     | INTEGER        | NOT NULL REFERENCES source(id) ON DELETE CASCADE | |
| text_range    | JSONB          | NOT NULL                                       | e.g., `{start:100, end:150}` or paragraph/offset |
| content       | TEXT           | NOT NULL                                       | Explanation text |
| author_type   | VARCHAR(10)    | NOT NULL CHECK (author_type IN ('system','user')) | |
| editable      | BOOLEAN        | NOT NULL DEFAULT true                           | User explanations editable; system not |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |
| updated_at    | TIMESTAMPTZ    |                                                | |

**Indexes**: `source_id`, `user_id`, GIN on `text_range`? We'll keep it simple; application will query by source and possibly range.

## Tagging

### `tag`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| name          | VARCHAR(50)    | NOT NULL UNIQUE                                | Normalized lowercase |

### `quiz_tag`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| quiz_id       | INTEGER        | REFERENCES quiz(id) ON DELETE CASCADE          | |
| tag_id        | INTEGER        | REFERENCES tag(id) ON DELETE CASCADE           | |
| PRIMARY KEY (quiz_id, tag_id) |           |                                                | |

**Indexes**: `tag_id`.

### `question_tag`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| question_id   | INTEGER        | REFERENCES question(id) ON DELETE CASCADE      | |
| tag_id        | INTEGER        | REFERENCES tag(id) ON DELETE CASCADE           | |
| PRIMARY KEY (question_id, tag_id) |       |                                                | |

**Indexes**: `tag_id`.

## Comments & Moderation

### `comment`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| parent_id     | INTEGER        | REFERENCES comment(id) ON DELETE CASCADE       | For nested replies (max depth 5 enforced by app) |
| target_type   | VARCHAR(20)    | NOT NULL CHECK (target_type IN ('quiz','source','question')) | |
| target_id     | INTEGER        | NOT NULL                                       | ID of the target entity |
| content       | TEXT           | NOT NULL                                       | |
| deleted_at    | TIMESTAMPTZ    |                                                | Soft delete |
| edited_at     | TIMESTAMPTZ    |                                                | Set when edited |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `target_type`, `target_id`, `created_at`, `parent_id`, `deleted_at`.  
**Note**: We'll rely on application to validate that `target_id` exists in the respective table (no FK due to polymorphic nature).

### `report`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Reporter |
| target_type   | VARCHAR(20)    | NOT NULL CHECK (target_type IN ('quiz','question','comment')) | |
| target_id     | INTEGER        | NOT NULL                                       | |
| reason        | TEXT           | NOT NULL                                       | |
| resolved      | BOOLEAN        | NOT NULL DEFAULT false                         | |
| resolved_by   | INTEGER        | REFERENCES users(id) ON DELETE SET NULL        | Admin who resolved |
| resolved_at   | TIMESTAMPTZ    |                                                | |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `target_type`, `target_id`, `resolved`, `created_at`.

### `admin_log`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| admin_id      | INTEGER        | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| action        | VARCHAR(50)    | NOT NULL                                       | e.g., 'ban_user', 'disable_quiz', 'delete_comment' |
| target_type   | VARCHAR(20)    |                                                | |
| target_id     | INTEGER        |                                                | |
| details       | JSONB          |                                                | Additional data |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `admin_id`, `created_at`.

## LLM & System Logs

### `llm_log`
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| user_id       | INTEGER        | REFERENCES users(id) ON DELETE SET NULL        | NULL if unauthenticated (not applicable here, all users logged in) |
| request_type  | VARCHAR(30)    | NOT NULL CHECK (request_type IN ('explain','generate_questions','summarize','grammar_check')) | |
| prompt        | TEXT           | NOT NULL                                       | The input sent to LLM |
| response      | TEXT           |                                                | Raw LLM output |
| tokens_used   | INTEGER        |                                                | Approximate token count |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `user_id`, `request_type`, `created_at`.

### `quiz_view` (for view counting)
| Column        | Type           | Modifiers                                      | Description |
|---------------|----------------|------------------------------------------------|-------------|
| id            | SERIAL         | PRIMARY KEY                                    | |
| quiz_id       | INTEGER        | NOT NULL REFERENCES quiz(id) ON DELETE CASCADE | |
| ip_address    | INET           | NOT NULL                                       | |
| viewed_at     | TIMESTAMPTZ    | NOT NULL DEFAULT NOW()                         | |

**Indexes**: `quiz_id`, `ip_address`, `viewed_at`.  
**Note**: Unique constraint on `(quiz_id, ip_address, date_trunc('hour', viewed_at))` could be enforced by application to ensure one view per IP per hour.

## Additional Considerations

- **Full‑Text Search**: Use PostgreSQL GIN indexes on `raw_text` (source), `content` (question), `text` (favorite_item), `title` and `description` (quiz). We'll create a combined search function or materialized view as needed.
- **Soft Deletes**: For tables with `deleted_at`, all queries should filter `deleted_at IS NULL` unless explicitly including deleted items (e.g., admin views).
- **Timestamps**: All tables include `created_at` and `updated_at` (where applicable). Use `TIMESTAMPTZ` for timezone awareness.
- **JSONB Validation**: Application must ensure metadata conforms to expected schemas per question type.
- **Rate Limiting**: Not stored in DB; handled by Redis.
- **File Storage**: File paths reference local filesystem; metadata in `source` table.
- **Concurrency**: Optimistic locking not required; last write wins for quiz answers.

This design covers all entities and relationships described in the SLP design document, with appropriate indexes and constraints for a PostgreSQL implementation.