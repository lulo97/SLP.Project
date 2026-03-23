
-- ===============================================
-- 0) RESET SCHEMA
-- ===============================================
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres; 
GRANT ALL ON SCHEMA public TO public;

BEGIN;


-- ===============================
-- 1) CREATE TABLES
-- ===============================
-- FILE: admin_log.sql
CREATE TABLE public.admin_log (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    action character varying(50) NOT NULL,
    target_type character varying(20),
    target_id integer,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FILE: comment_history.sql
CREATE TABLE public.comment_history (
    id integer NOT NULL,
    comment_id integer NOT NULL,
    content text NOT NULL,
    edited_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FILE: comment.sql
CREATE TABLE public.comment (
    id integer NOT NULL,
    user_id integer NOT NULL,
    parent_id integer,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    content text NOT NULL,
    deleted_at timestamp with time zone,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT comment_target_type_check CHECK (((target_type)::text = ANY (ARRAY[('quiz'::character varying)::text, ('source'::character varying)::text, ('question'::character varying)::text])))
);

-- FILE: daily_word.sql
CREATE TABLE public.daily_word (
    id integer NOT NULL,
    word text NOT NULL,
    part_of_speech character varying(50),
    vietnamese_translation text,
    example text,
    origin text,
    fun_fact text,
    target_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- FILE: explanation.sql
CREATE TABLE public.explanation (
    id integer NOT NULL,
    user_id integer,
    source_id integer NOT NULL,
    text_range jsonb NOT NULL,
    content text NOT NULL,
    author_type character varying(10) NOT NULL,
    editable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT explanation_author_type_check CHECK (((author_type)::text = ANY (ARRAY[('system'::character varying)::text, ('user'::character varying)::text])))
);

-- FILE: favorite_item.sql
CREATE TABLE public.favorite_item (
    id integer NOT NULL,
    user_id integer NOT NULL,
    text text NOT NULL,
    type character varying(20) DEFAULT 'word'::character varying NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT favorite_item_type_check CHECK (((type)::text = ANY (ARRAY[('word'::character varying)::text, ('phrase'::character varying)::text, ('idiom'::character varying)::text, ('other'::character varying)::text])))
);

-- FILE: llm_log.sql
CREATE TABLE public.llm_log (
    id integer NOT NULL,
    user_id integer,
    request_type character varying(30) NOT NULL,
    prompt text NOT NULL,
    response text,
    tokens_used integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    job_id character varying(50),
    status character varying(20),
    completed_at timestamp with time zone,
    error text,
    CONSTRAINT llm_log_request_type_check CHECK (((request_type)::text = ANY (ARRAY[('explain'::character varying)::text, ('generate_questions'::character varying)::text, ('summarize'::character varying)::text, ('grammar_check'::character varying)::text])))
);

-- FILE: metrics.sql
CREATE TABLE public.metrics (
    id bigint NOT NULL,
    name text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    value double precision NOT NULL,
    tags text
);

-- FILE: note.sql
CREATE TABLE public.note (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FILE: question_tag.sql
CREATE TABLE public.question_tag (
    question_id integer NOT NULL,
    tag_id integer NOT NULL
);

-- FILE: question.sql
CREATE TABLE public.question (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(20) NOT NULL,
    content text NOT NULL,
    explanation text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT question_type_check CHECK (((type)::text = ANY (ARRAY[('multiple_choice'::character varying)::text, ('single_choice'::character varying)::text, ('fill_blank'::character varying)::text, ('ordering'::character varying)::text, ('matching'::character varying)::text, ('true_false'::character varying)::text, ('flashcard'::character varying)::text])))
);

-- FILE: quiz_attempt_answer.sql
CREATE TABLE public.quiz_attempt_answer (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    quiz_question_id integer NOT NULL,
    question_snapshot jsonb NOT NULL,
    answer_json jsonb NOT NULL,
    is_correct boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FILE: quiz_attempt.sql
CREATE TABLE public.quiz_attempt (
    id integer NOT NULL,
    user_id integer NOT NULL,
    quiz_id integer NOT NULL,
    start_time timestamp with time zone DEFAULT now() NOT NULL,
    end_time timestamp with time zone,
    score integer,
    max_score integer NOT NULL,
    question_count integer NOT NULL,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quiz_attempt_status_check CHECK (((status)::text = ANY (ARRAY[('in_progress'::character varying)::text, ('completed'::character varying)::text, ('abandoned'::character varying)::text])))
);

-- FILE: quiz_note.sql
CREATE TABLE public.quiz_note (
    quiz_id integer NOT NULL,
    note_id integer NOT NULL
);

-- FILE: quiz_question.sql
CREATE TABLE public.quiz_question (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    original_question_id integer,
    question_snapshot jsonb NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FILE: quiz_source.sql
CREATE TABLE public.quiz_source (
    quiz_id integer NOT NULL,
    source_id integer NOT NULL
);

-- FILE: quiz_tag.sql
CREATE TABLE public.quiz_tag (
    quiz_id integer NOT NULL,
    tag_id integer NOT NULL
);

-- FILE: quiz_view.sql
CREATE TABLE public.quiz_view (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    ip_address inet NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    viewed_hour timestamp with time zone DEFAULT now() NOT NULL
);

-- FILE: quiz.sql
CREATE TABLE public.quiz (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    visibility character varying(20) DEFAULT 'private'::character varying NOT NULL,
    disabled boolean DEFAULT false NOT NULL,
    note_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quiz_visibility_check CHECK (((visibility)::text = ANY (ARRAY[('public'::character varying)::text, ('private'::character varying)::text])))
);

-- FILE: report.sql
CREATE TABLE public.report (
    id integer NOT NULL,
    user_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    reason text NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_by integer,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attempt_id integer,
    CONSTRAINT report_target_type_check CHECK (((target_type)::text = ANY (ARRAY['quiz'::text, 'question'::text, 'comment'::text, 'quiz_question'::text])))
);

-- FILE: sessions.sql
CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id integer NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp without time zone,
    expires_at timestamp without time zone,
    revoked boolean DEFAULT false,
    ip_address text,
    user_agent text
);

-- FILE: source.sql
CREATE TABLE public.source (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    url text,
    content jsonb,
    raw_html text,
    raw_text text,
    file_path text,
    metadata jsonb,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT source_type_check CHECK (((type)::text = ANY (ARRAY['pdf'::text, 'link'::text, 'text'::text])))
);

-- FILE: tag.sql
CREATE TABLE public.tag (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);

-- FILE: user_source_progress.sql
CREATE TABLE public.user_source_progress (
    id integer NOT NULL,
    user_id integer NOT NULL,
    source_id integer NOT NULL,
    last_position text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FILE: users.sql
CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(255),
    email_confirmed boolean DEFAULT false NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    password_reset_token text,
    password_reset_expiry timestamp with time zone,
    email_verification_token text,
    avatar_filename text,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('user'::character varying)::text, ('admin'::character varying)::text]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('banned'::character varying)::text])))
);


-- ===============================
-- 2) SETUP: SEQUENCES / DEFAULTS / PK / UNIQUE / CHECK
-- ===============================
-- FILE: admin_log.sql
CREATE SEQUENCE public.admin_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: admin_log.sql
ALTER SEQUENCE public.admin_log_id_seq OWNED BY public.admin_log.id;

-- FILE: admin_log.sql
ALTER TABLE ONLY public.admin_log ALTER COLUMN id SET DEFAULT nextval('public.admin_log_id_seq'::regclass);

-- FILE: admin_log.sql
ALTER TABLE ONLY public.admin_log
    ADD CONSTRAINT admin_log_pkey PRIMARY KEY (id);

-- FILE: comment_history.sql
CREATE SEQUENCE public.comment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: comment_history.sql
ALTER SEQUENCE public.comment_history_id_seq OWNED BY public.comment_history.id;

-- FILE: comment_history.sql
ALTER TABLE ONLY public.comment_history ALTER COLUMN id SET DEFAULT nextval('public.comment_history_id_seq'::regclass);

-- FILE: comment_history.sql
ALTER TABLE ONLY public.comment_history
    ADD CONSTRAINT comment_history_pkey PRIMARY KEY (id);

-- FILE: comment.sql
CREATE SEQUENCE public.comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: comment.sql
ALTER SEQUENCE public.comment_id_seq OWNED BY public.comment.id;

-- FILE: comment.sql
ALTER TABLE ONLY public.comment ALTER COLUMN id SET DEFAULT nextval('public.comment_id_seq'::regclass);

-- FILE: comment.sql
ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_pkey PRIMARY KEY (id);

-- FILE: daily_word.sql
CREATE SEQUENCE public.daily_word_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: daily_word.sql
ALTER SEQUENCE public.daily_word_id_seq OWNED BY public.daily_word.id;

-- FILE: daily_word.sql
ALTER TABLE ONLY public.daily_word ALTER COLUMN id SET DEFAULT nextval('public.daily_word_id_seq'::regclass);

-- FILE: daily_word.sql
ALTER TABLE ONLY public.daily_word
    ADD CONSTRAINT daily_word_pkey PRIMARY KEY (id);

-- FILE: daily_word.sql
ALTER TABLE ONLY public.daily_word
    ADD CONSTRAINT daily_word_target_date_key UNIQUE (target_date);

-- FILE: explanation.sql
CREATE SEQUENCE public.explanation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: explanation.sql
ALTER SEQUENCE public.explanation_id_seq OWNED BY public.explanation.id;

-- FILE: explanation.sql
ALTER TABLE ONLY public.explanation ALTER COLUMN id SET DEFAULT nextval('public.explanation_id_seq'::regclass);

-- FILE: explanation.sql
ALTER TABLE ONLY public.explanation
    ADD CONSTRAINT explanation_pkey PRIMARY KEY (id);

-- FILE: favorite_item.sql
CREATE SEQUENCE public.favorite_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: favorite_item.sql
ALTER SEQUENCE public.favorite_item_id_seq OWNED BY public.favorite_item.id;

-- FILE: favorite_item.sql
ALTER TABLE ONLY public.favorite_item ALTER COLUMN id SET DEFAULT nextval('public.favorite_item_id_seq'::regclass);

-- FILE: favorite_item.sql
ALTER TABLE ONLY public.favorite_item
    ADD CONSTRAINT favorite_item_pkey PRIMARY KEY (id);

-- FILE: llm_log.sql
CREATE SEQUENCE public.llm_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: llm_log.sql
ALTER SEQUENCE public.llm_log_id_seq OWNED BY public.llm_log.id;

-- FILE: llm_log.sql
ALTER TABLE ONLY public.llm_log ALTER COLUMN id SET DEFAULT nextval('public.llm_log_id_seq'::regclass);

-- FILE: llm_log.sql
ALTER TABLE ONLY public.llm_log
    ADD CONSTRAINT llm_log_pkey PRIMARY KEY (id);

-- FILE: metrics.sql
CREATE SEQUENCE public.metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: metrics.sql
ALTER SEQUENCE public.metrics_id_seq OWNED BY public.metrics.id;

-- FILE: metrics.sql
ALTER TABLE ONLY public.metrics ALTER COLUMN id SET DEFAULT nextval('public.metrics_id_seq'::regclass);

-- FILE: metrics.sql
ALTER TABLE ONLY public.metrics
    ADD CONSTRAINT metrics_pkey PRIMARY KEY (id);

-- FILE: note.sql
CREATE SEQUENCE public.note_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: note.sql
ALTER SEQUENCE public.note_id_seq OWNED BY public.note.id;

-- FILE: note.sql
ALTER TABLE ONLY public.note ALTER COLUMN id SET DEFAULT nextval('public.note_id_seq'::regclass);

-- FILE: note.sql
ALTER TABLE ONLY public.note
    ADD CONSTRAINT note_pkey PRIMARY KEY (id);

-- FILE: question_tag.sql
ALTER TABLE ONLY public.question_tag
    ADD CONSTRAINT question_tag_pkey PRIMARY KEY (question_id, tag_id);

-- FILE: question.sql
CREATE SEQUENCE public.question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: question.sql
ALTER SEQUENCE public.question_id_seq OWNED BY public.question.id;

-- FILE: question.sql
ALTER TABLE ONLY public.question ALTER COLUMN id SET DEFAULT nextval('public.question_id_seq'::regclass);

-- FILE: question.sql
ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_pkey PRIMARY KEY (id);

-- FILE: quiz_attempt_answer.sql
CREATE SEQUENCE public.quiz_attempt_answer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: quiz_attempt_answer.sql
ALTER SEQUENCE public.quiz_attempt_answer_id_seq OWNED BY public.quiz_attempt_answer.id;

-- FILE: quiz_attempt_answer.sql
ALTER TABLE ONLY public.quiz_attempt_answer ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempt_answer_id_seq'::regclass);

-- FILE: quiz_attempt_answer.sql
ALTER TABLE ONLY public.quiz_attempt_answer
    ADD CONSTRAINT quiz_attempt_answer_pkey PRIMARY KEY (id);

-- FILE: quiz_attempt.sql
CREATE SEQUENCE public.quiz_attempt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: quiz_attempt.sql
ALTER SEQUENCE public.quiz_attempt_id_seq OWNED BY public.quiz_attempt.id;

-- FILE: quiz_attempt.sql
ALTER TABLE ONLY public.quiz_attempt ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempt_id_seq'::regclass);

-- FILE: quiz_attempt.sql
ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_pkey PRIMARY KEY (id);

-- FILE: quiz_note.sql
ALTER TABLE ONLY public.quiz_note
    ADD CONSTRAINT quiz_note_pkey PRIMARY KEY (quiz_id, note_id);

-- FILE: quiz_question.sql
CREATE SEQUENCE public.quiz_question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: quiz_question.sql
ALTER SEQUENCE public.quiz_question_id_seq OWNED BY public.quiz_question.id;

-- FILE: quiz_question.sql
ALTER TABLE ONLY public.quiz_question ALTER COLUMN id SET DEFAULT nextval('public.quiz_question_id_seq'::regclass);

-- FILE: quiz_question.sql
ALTER TABLE ONLY public.quiz_question
    ADD CONSTRAINT quiz_question_pkey PRIMARY KEY (id);

-- FILE: quiz_source.sql
ALTER TABLE ONLY public.quiz_source
    ADD CONSTRAINT quiz_source_pkey PRIMARY KEY (quiz_id, source_id);

-- FILE: quiz_tag.sql
ALTER TABLE ONLY public.quiz_tag
    ADD CONSTRAINT quiz_tag_pkey PRIMARY KEY (quiz_id, tag_id);

-- FILE: quiz_view.sql
CREATE SEQUENCE public.quiz_view_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: quiz_view.sql
ALTER SEQUENCE public.quiz_view_id_seq OWNED BY public.quiz_view.id;

-- FILE: quiz_view.sql
ALTER TABLE ONLY public.quiz_view ALTER COLUMN id SET DEFAULT nextval('public.quiz_view_id_seq'::regclass);

-- FILE: quiz_view.sql
ALTER TABLE ONLY public.quiz_view
    ADD CONSTRAINT quiz_view_pkey PRIMARY KEY (id);

-- FILE: quiz.sql
CREATE SEQUENCE public.quiz_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: quiz.sql
ALTER SEQUENCE public.quiz_id_seq OWNED BY public.quiz.id;

-- FILE: quiz.sql
ALTER TABLE ONLY public.quiz ALTER COLUMN id SET DEFAULT nextval('public.quiz_id_seq'::regclass);

-- FILE: quiz.sql
ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_pkey PRIMARY KEY (id);

-- FILE: report.sql
CREATE SEQUENCE public.report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: report.sql
ALTER SEQUENCE public.report_id_seq OWNED BY public.report.id;

-- FILE: report.sql
ALTER TABLE ONLY public.report ALTER COLUMN id SET DEFAULT nextval('public.report_id_seq'::regclass);

-- FILE: report.sql
ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_pkey PRIMARY KEY (id);

-- FILE: sessions.sql
ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

-- FILE: source.sql
CREATE SEQUENCE public.source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: source.sql
ALTER SEQUENCE public.source_id_seq OWNED BY public.source.id;

-- FILE: source.sql
ALTER TABLE ONLY public.source ALTER COLUMN id SET DEFAULT nextval('public.source_id_seq'::regclass);

-- FILE: source.sql
ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_pkey PRIMARY KEY (id);

-- FILE: tag.sql
CREATE SEQUENCE public.tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: tag.sql
ALTER SEQUENCE public.tag_id_seq OWNED BY public.tag.id;

-- FILE: tag.sql
ALTER TABLE ONLY public.tag ALTER COLUMN id SET DEFAULT nextval('public.tag_id_seq'::regclass);

-- FILE: tag.sql
ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_name_key UNIQUE (name);

-- FILE: tag.sql
ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_pkey PRIMARY KEY (id);

-- FILE: user_source_progress.sql
CREATE SEQUENCE public.user_source_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: user_source_progress.sql
ALTER SEQUENCE public.user_source_progress_id_seq OWNED BY public.user_source_progress.id;

-- FILE: user_source_progress.sql
ALTER TABLE ONLY public.user_source_progress ALTER COLUMN id SET DEFAULT nextval('public.user_source_progress_id_seq'::regclass);

-- FILE: user_source_progress.sql
ALTER TABLE ONLY public.user_source_progress
    ADD CONSTRAINT user_source_progress_pkey PRIMARY KEY (id);

-- FILE: user_source_progress.sql
ALTER TABLE ONLY public.user_source_progress
    ADD CONSTRAINT user_source_progress_user_id_source_id_key UNIQUE (user_id, source_id);

-- FILE: users.sql
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- FILE: users.sql
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

-- FILE: users.sql
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

-- FILE: users.sql
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

-- FILE: users.sql
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- FILE: users.sql
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


-- ===============================
-- 3) INDEXES
-- ===============================
-- FILE: admin_log.sql
CREATE INDEX idx_admin_log_admin ON public.admin_log USING btree (admin_id);

-- FILE: admin_log.sql
CREATE INDEX idx_admin_log_created ON public.admin_log USING btree (created_at);

-- FILE: comment_history.sql
CREATE INDEX idx_comment_history_comment ON public.comment_history USING btree (comment_id);

-- FILE: comment_history.sql
CREATE INDEX idx_comment_history_edited ON public.comment_history USING btree (edited_at);

-- FILE: comment.sql
CREATE INDEX idx_comment_created ON public.comment USING btree (created_at);

-- FILE: comment.sql
CREATE INDEX idx_comment_deleted ON public.comment USING btree (deleted_at) WHERE (deleted_at IS NULL);

-- FILE: comment.sql
CREATE INDEX idx_comment_parent ON public.comment USING btree (parent_id);

-- FILE: comment.sql
CREATE INDEX idx_comment_target ON public.comment USING btree (target_type, target_id);

-- FILE: explanation.sql
CREATE INDEX idx_explanation_source ON public.explanation USING btree (source_id);

-- FILE: explanation.sql
CREATE INDEX idx_explanation_user ON public.explanation USING btree (user_id);

-- FILE: favorite_item.sql
CREATE INDEX idx_favorite_fts ON public.favorite_item USING gin (to_tsvector('english'::regconfig, text));

-- FILE: favorite_item.sql
CREATE INDEX idx_favorite_user ON public.favorite_item USING btree (user_id);

-- FILE: llm_log.sql
CREATE INDEX idx_llm_log_created ON public.llm_log USING btree (created_at);

-- FILE: llm_log.sql
CREATE INDEX idx_llm_log_job_id ON public.llm_log USING btree (job_id);

-- FILE: llm_log.sql
CREATE INDEX idx_llm_log_status ON public.llm_log USING btree (status);

-- FILE: llm_log.sql
CREATE INDEX idx_llm_log_type ON public.llm_log USING btree (request_type);

-- FILE: llm_log.sql
CREATE INDEX idx_llm_log_user ON public.llm_log USING btree (user_id);

-- FILE: metrics.sql
CREATE INDEX ix_metrics_name_timestamp ON public.metrics USING btree (name, "timestamp");

-- FILE: note.sql
CREATE INDEX idx_note_user ON public.note USING btree (user_id);

-- FILE: question_tag.sql
CREATE INDEX idx_question_tag_tag ON public.question_tag USING btree (tag_id);

-- FILE: question.sql
CREATE INDEX idx_question_fts ON public.question USING gin (to_tsvector('english'::regconfig, content));

-- FILE: question.sql
CREATE INDEX idx_question_metadata ON public.question USING gin (metadata);

-- FILE: question.sql
CREATE INDEX idx_question_type ON public.question USING btree (type);

-- FILE: question.sql
CREATE INDEX idx_question_user ON public.question USING btree (user_id);

-- FILE: quiz_attempt_answer.sql
CREATE INDEX idx_attempt_answer_attempt ON public.quiz_attempt_answer USING btree (attempt_id);

-- FILE: quiz_attempt_answer.sql
CREATE INDEX idx_attempt_answer_question ON public.quiz_attempt_answer USING btree (quiz_question_id);

-- FILE: quiz_attempt.sql
CREATE INDEX idx_attempt_quiz ON public.quiz_attempt USING btree (quiz_id);

-- FILE: quiz_attempt.sql
CREATE INDEX idx_attempt_start ON public.quiz_attempt USING btree (start_time);

-- FILE: quiz_attempt.sql
CREATE INDEX idx_attempt_status ON public.quiz_attempt USING btree (status);

-- FILE: quiz_attempt.sql
CREATE INDEX idx_attempt_user ON public.quiz_attempt USING btree (user_id);

-- FILE: quiz_note.sql
CREATE INDEX idx_quiz_note_note ON public.quiz_note USING btree (note_id);

-- FILE: quiz_question.sql
CREATE INDEX idx_quiz_question_order ON public.quiz_question USING btree (display_order);

-- FILE: quiz_question.sql
CREATE INDEX idx_quiz_question_original ON public.quiz_question USING btree (original_question_id);

-- FILE: quiz_question.sql
CREATE INDEX idx_quiz_question_quiz ON public.quiz_question USING btree (quiz_id);

-- FILE: quiz_source.sql
CREATE INDEX idx_quiz_source_source ON public.quiz_source USING btree (source_id);

-- FILE: quiz_tag.sql
CREATE INDEX idx_quiz_tag_tag ON public.quiz_tag USING btree (tag_id);

-- FILE: quiz_view.sql
CREATE INDEX idx_quiz_view_ip ON public.quiz_view USING btree (ip_address);

-- FILE: quiz_view.sql
CREATE INDEX idx_quiz_view_quiz ON public.quiz_view USING btree (quiz_id);

-- FILE: quiz_view.sql
CREATE UNIQUE INDEX idx_quiz_view_unique_hour ON public.quiz_view USING btree (quiz_id, ip_address, viewed_hour);

-- FILE: quiz_view.sql
CREATE INDEX idx_quiz_view_viewed ON public.quiz_view USING btree (viewed_at);

-- FILE: quiz.sql
CREATE INDEX idx_quiz_created ON public.quiz USING btree (created_at);

-- FILE: quiz.sql
CREATE INDEX idx_quiz_disabled ON public.quiz USING btree (disabled);

-- FILE: quiz.sql
CREATE INDEX idx_quiz_fts ON public.quiz USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || COALESCE(description, ''::text))));

-- FILE: quiz.sql
CREATE INDEX idx_quiz_user ON public.quiz USING btree (user_id);

-- FILE: quiz.sql
CREATE INDEX idx_quiz_visibility ON public.quiz USING btree (visibility);

-- FILE: report.sql
CREATE INDEX idx_report_created ON public.report USING btree (created_at);

-- FILE: report.sql
CREATE INDEX idx_report_resolved ON public.report USING btree (resolved);

-- FILE: report.sql
CREATE INDEX idx_report_target ON public.report USING btree (target_type, target_id);

-- FILE: report.sql
CREATE INDEX idx_report_user_id ON public.report USING btree (user_id);

-- FILE: source.sql
CREATE INDEX idx_source_deleted ON public.source USING btree (deleted_at) WHERE (deleted_at IS NULL);

-- FILE: source.sql
CREATE INDEX idx_source_fts ON public.source USING gin (to_tsvector('english'::regconfig, raw_text));

-- FILE: source.sql
CREATE INDEX idx_source_metadata ON public.source USING gin (metadata);

-- FILE: source.sql
CREATE INDEX idx_source_type ON public.source USING btree (type);

-- FILE: source.sql
CREATE INDEX idx_source_user ON public.source USING btree (user_id);

-- FILE: user_source_progress.sql
CREATE INDEX idx_progress_source ON public.user_source_progress USING btree (source_id);

-- FILE: user_source_progress.sql
CREATE INDEX idx_progress_user ON public.user_source_progress USING btree (user_id);


-- ===============================
-- 4) FOREIGN KEYS
-- ===============================
-- FILE: admin_log.sql
ALTER TABLE ONLY public.admin_log
    ADD CONSTRAINT admin_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: comment_history.sql
ALTER TABLE ONLY public.comment_history
    ADD CONSTRAINT comment_history_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comment(id) ON DELETE CASCADE;

-- FILE: comment.sql
ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comment(id) ON DELETE CASCADE;

-- FILE: comment.sql
ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: explanation.sql
ALTER TABLE ONLY public.explanation
    ADD CONSTRAINT explanation_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(id) ON DELETE CASCADE;

-- FILE: explanation.sql
ALTER TABLE ONLY public.explanation
    ADD CONSTRAINT explanation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- FILE: favorite_item.sql
ALTER TABLE ONLY public.favorite_item
    ADD CONSTRAINT favorite_item_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: llm_log.sql
ALTER TABLE ONLY public.llm_log
    ADD CONSTRAINT llm_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- FILE: note.sql
ALTER TABLE ONLY public.note
    ADD CONSTRAINT note_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: question_tag.sql
ALTER TABLE ONLY public.question_tag
    ADD CONSTRAINT question_tag_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question(id) ON DELETE CASCADE;

-- FILE: question_tag.sql
ALTER TABLE ONLY public.question_tag
    ADD CONSTRAINT question_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tag(id) ON DELETE CASCADE;

-- FILE: question.sql
ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: quiz_attempt_answer.sql
ALTER TABLE ONLY public.quiz_attempt_answer
    ADD CONSTRAINT quiz_attempt_answer_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempt(id) ON DELETE CASCADE;

-- FILE: quiz_attempt_answer.sql
ALTER TABLE ONLY public.quiz_attempt_answer
    ADD CONSTRAINT quiz_attempt_answer_quiz_question_id_fkey FOREIGN KEY (quiz_question_id) REFERENCES public.quiz_question(id) ON DELETE CASCADE;

-- FILE: quiz_attempt.sql
ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

-- FILE: quiz_attempt.sql
ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: quiz_note.sql
ALTER TABLE ONLY public.quiz_note
    ADD CONSTRAINT quiz_note_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.note(id) ON DELETE CASCADE;

-- FILE: quiz_note.sql
ALTER TABLE ONLY public.quiz_note
    ADD CONSTRAINT quiz_note_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

-- FILE: quiz_question.sql
ALTER TABLE ONLY public.quiz_question
    ADD CONSTRAINT quiz_question_original_question_id_fkey FOREIGN KEY (original_question_id) REFERENCES public.question(id) ON DELETE SET NULL;

-- FILE: quiz_question.sql
ALTER TABLE ONLY public.quiz_question
    ADD CONSTRAINT quiz_question_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

-- FILE: quiz_source.sql
ALTER TABLE ONLY public.quiz_source
    ADD CONSTRAINT quiz_source_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

-- FILE: quiz_source.sql
ALTER TABLE ONLY public.quiz_source
    ADD CONSTRAINT quiz_source_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(id) ON DELETE CASCADE;

-- FILE: quiz_tag.sql
ALTER TABLE ONLY public.quiz_tag
    ADD CONSTRAINT quiz_tag_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

-- FILE: quiz_tag.sql
ALTER TABLE ONLY public.quiz_tag
    ADD CONSTRAINT quiz_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tag(id) ON DELETE CASCADE;

-- FILE: quiz_view.sql
ALTER TABLE ONLY public.quiz_view
    ADD CONSTRAINT quiz_view_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

-- FILE: quiz.sql
ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.note(id) ON DELETE SET NULL;

-- FILE: quiz.sql
ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: report.sql
ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempt(id) ON DELETE SET NULL;

-- FILE: report.sql
ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- FILE: report.sql
ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: source.sql
ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FILE: user_source_progress.sql
ALTER TABLE ONLY public.user_source_progress
    ADD CONSTRAINT user_source_progress_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(id) ON DELETE CASCADE;

-- FILE: user_source_progress.sql
ALTER TABLE ONLY public.user_source_progress
    ADD CONSTRAINT user_source_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- ===============================
-- 5) SEED DATA
-- ===============================
delete from users where username = 'admin';

INSERT INTO public.users
(username, password_hash, email, email_confirmed, "role", status, created_at, updated_at, password_reset_token, password_reset_expiry, email_verification_token, avatar_filename)
VALUES('admin', 'QJ/Y63lvp9XojMnTHtuMeg==.nfg0oSWRRpU91U9j5s8C5jttA5HjMUUXvAYzAkyn6wk=', 'admin@gmail.com', false, 'admin', 'active', '2026-03-21 10:07:33.595', '2026-03-21 10:07:33.595', NULL, NULL, NULL, NULL);

truncate table daily_word;

INSERT INTO public.daily_word (word, part_of_speech, vietnamese_translation, example, origin, fun_fact, target_date) VALUES
('Serendipity', 'Noun', 'Sự tình cờ may mắn', 'Finding this old photo was a stroke of serendipity.', 'Persian fairy tale "The Three Princes of Serendip"', 'Coined by Horace Walpole in 1754.', CURRENT_DATE - INTERVAL '2 days'),
('Ephemeral', 'Adjective', 'Phù du, chóng tàn', 'The beauty of sunset is ephemeral.', 'Greek "ephemeros" meaning "lasting a day"', 'Mayflies are the most ephemeral insects.', CURRENT_DATE - INTERVAL '1 day'),
('Petrichor', 'Noun', 'Mùi đất sau cơn mưa', 'I love the fresh petrichor after a dry spell.', 'Greek "petra" (stone) + "ichor" (fluid of the gods)', 'The smell comes from plant oils and soil bacteria.', CURRENT_DATE),
('Luminescence', 'Noun', 'Sự phát quang', 'The ocean glowed with bioluminescence.', 'Latin "lumen" (light)', 'Fireflies use luminescence to find mates.', CURRENT_DATE + INTERVAL '1 day'),
('Solitude', 'Noun', 'Sự biệt lập, tĩnh mịch', 'He enjoyed the solitude of the mountains.', 'Latin "solitudo" from "solus" (alone)', 'Solitude is often chosen, while loneliness is forced.', CURRENT_DATE + INTERVAL '2 days'),
('Eloquence', 'Noun', 'Sự hùng biện, tài ăn nói', 'Her eloquence moved the entire audience.', 'Latin "eloqui" (to speak out)', 'Cicero was considered the master of Roman eloquence.', CURRENT_DATE + INTERVAL '3 days'),
('Ineffable', 'Adjective', 'Không thốt nên lời', 'The view from the summit was ineffable.', 'Latin "ineffabilis" (unutterable)', 'Often used for religious or mystical experiences.', CURRENT_DATE + INTERVAL '4 days'),
('Hiraeth', 'Noun', 'Nỗi nhớ quê hương (không thể về)', 'He felt a deep hiraeth for the hills of Wales.', 'Welsh origin', 'It implies a longing for a home that maybe never was.', CURRENT_DATE + INTERVAL '5 days'),
('Mellifluous', 'Adjective', 'Ngọt ngào, dịu dàng (giọng nói)', 'The singer had a mellifluous voice.', 'Latin "mel" (honey) + "fluere" (to flow)', 'Literally means "flowing like honey."', CURRENT_DATE + INTERVAL '6 days'),
('Ethereal', 'Adjective', 'Thanh tao, nhẹ nhàng', 'The mist gave the forest an ethereal look.', 'Greek "aither" (upper air)', 'Originally referred to the highest regions of space.', CURRENT_DATE + INTERVAL '7 days'),
('Sonder', 'Noun', 'Sự nhận thức về cuộc đời người lạ', 'He felt a sense of sonder watching the crowd.', 'Coined by John Koenig', 'Every passerby has a life as complex as your own.', CURRENT_DATE + INTERVAL '8 days'),
('Defenestration', 'Noun', 'Hành động ném ai đó qua cửa sổ', 'The Defenestration of Prague started a war.', 'Latin "de-" (down) + "fenestra" (window)', 'This word was invented for a political act.', CURRENT_DATE + INTERVAL '9 days'),
('Vellichor', 'Noun', 'Nỗi buồn hoài cổ của tiệm sách cũ', 'The vellichor of the shop was intoxicating.', 'Neologism (John Koenig)', 'It captures the "soul" of old books and paper.', CURRENT_DATE + INTERVAL '10 days'),
('Oblivion', 'Noun', 'Sự lãng quên', 'The old empire faded into oblivion.', 'Latin "oblivio"', 'Commonly used in sci-fi to describe the end of time.', CURRENT_DATE + INTERVAL '11 days'),
('Quintessential', 'Adjective', 'Tinh túy, điển hình', 'He is the quintessential English gentleman.', 'Latin "quinta essentia"', 'In alchemy, it was the "fifth element."', CURRENT_DATE + INTERVAL '12 days'),
('Limerence', 'Noun', 'Sự say mê, cuồng si', 'Is it true love, or just limerence?', 'Coined by Dorothy Tennov', 'It describes the "infatuation" stage.', CURRENT_DATE + INTERVAL '13 days'),
('Resilience', 'Noun', 'Sự kiên cường, phục hồi', 'The community showed great resilience.', 'Latin "resilire" (to jump back)', 'In physics, it refers to a material returning to shape.', CURRENT_DATE + INTERVAL '14 days'),
('Wanderlust', 'Noun', 'Nỗi khát khao đi du lịch', 'Her wanderlust took her to every continent.', 'German "wandern" (hike) + "Lust" (desire)', 'Became popular in English in the 19th century.', CURRENT_DATE + INTERVAL '15 days'),
('Aurora', 'Noun', 'Cực quang / Bình minh', 'They traveled north to see the Aurora Borealis.', 'Latin for "dawn"', 'Aurora was the Roman goddess of the sunrise.', CURRENT_DATE + INTERVAL '16 days'),
('Lullaby', 'Noun', 'Bài hát ru', 'The mother sang a soft lullaby.', 'Middle English "lullen" (to lull)', 'The word imitates the "lu-lu" sounds.', CURRENT_DATE + INTERVAL '17 days'),
('Halcyon', 'Adjective', 'Thanh bình, êm đềm', 'They recalled the halcyon days of youth.', 'Greek "alkyon"', 'Refers to a period when the sea stays calm.', CURRENT_DATE + INTERVAL '18 days'),
('Euphoria', 'Noun', 'Trạng thái phởn phơ, hạnh phúc', 'Winning the race induced euphoria.', 'Greek "euphoros"', 'Often used to describe intense joy.', CURRENT_DATE + INTERVAL '19 days'),
('Aquiver', 'Adjective', 'Run rẩy (vì phấn khích)', 'She was aquiver with anticipation.', 'English "a-" + "quiver"', 'A literary way to say someone is trembling.', CURRENT_DATE + INTERVAL '20 days'),
('Bibliosmia', 'Noun', 'Mùi của sách (thường là sách cũ)', 'She inhaled the bibliosmia of the library.', 'Greek "biblio" + "osme"', 'Most people find the smell of old paper comforting.', CURRENT_DATE + INTERVAL '21 days'),
('Chatoyant', 'Adjective', 'Có ánh xà cừ, lấp lánh', 'The cat had chatoyant amber eyes.', 'French "chat" (cat)', 'Refers to light reflection similar to a cat’s eye.', CURRENT_DATE + INTERVAL '22 days'),
('Ebullience', 'Noun', 'Sự sôi nổi, nhiệt huyết', 'His ebullience was contagious.', 'Latin "ebullire" (to bubble up)', 'Imagine a pot of water bubbling over with energy.', CURRENT_DATE + INTERVAL '23 days'),
('Incandescent', 'Adjective', 'Sáng chói, rực rỡ', 'The sky was incandescent with stars.', 'Latin "incandescere"', 'Also used to describe someone full of emotion.', CURRENT_DATE + INTERVAL '24 days'),
('Panacea', 'Noun', 'Thuốc trị bách bệnh', 'Technology is not a panacea for all problems.', 'Greek "pan" (all) + "akos" (cure)', 'Named after the Greek goddess of universal remedy.', CURRENT_DATE + INTERVAL '25 days'),
('Sempiternal', 'Adjective', 'Vĩnh cửu, bất diệt', 'The sempiternal cycle of the seasons.', 'Latin "semper" + "aeternus"', 'Implies "always having been."', CURRENT_DATE + INTERVAL '26 days'),
('Syzygy', 'Noun', 'Sự thẳng hàng của các thiên thể', 'A solar eclipse is a form of syzygy.', 'Greek "syzygos"', 'One of the few English words with three "y"s!', CURRENT_DATE + INTERVAL '27 days');

COMMIT;