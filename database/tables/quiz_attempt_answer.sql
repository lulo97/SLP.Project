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

CREATE SEQUENCE public.quiz_attempt_answer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.quiz_attempt_answer_id_seq OWNED BY public.quiz_attempt_answer.id;

ALTER TABLE ONLY public.quiz_attempt_answer ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempt_answer_id_seq'::regclass);

ALTER TABLE ONLY public.quiz_attempt_answer
    ADD CONSTRAINT quiz_attempt_answer_pkey PRIMARY KEY (id);

CREATE INDEX idx_attempt_answer_attempt ON public.quiz_attempt_answer USING btree (attempt_id);

CREATE INDEX idx_attempt_answer_question ON public.quiz_attempt_answer USING btree (quiz_question_id);

ALTER TABLE ONLY public.quiz_attempt_answer
    ADD CONSTRAINT quiz_attempt_answer_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempt(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.quiz_attempt_answer
    ADD CONSTRAINT quiz_attempt_answer_quiz_question_id_fkey FOREIGN KEY (quiz_question_id) REFERENCES public.quiz_question(id) ON DELETE CASCADE;
