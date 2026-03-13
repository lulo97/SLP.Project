CREATE TABLE public.quiz_question (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    original_question_id integer,
    question_snapshot jsonb NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.quiz_question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.quiz_question_id_seq OWNED BY public.quiz_question.id;

ALTER TABLE ONLY public.quiz_question ALTER COLUMN id SET DEFAULT nextval('public.quiz_question_id_seq'::regclass);

ALTER TABLE ONLY public.quiz_question
    ADD CONSTRAINT quiz_question_pkey PRIMARY KEY (id);

CREATE INDEX idx_quiz_question_order ON public.quiz_question USING btree (display_order);

CREATE INDEX idx_quiz_question_original ON public.quiz_question USING btree (original_question_id);

CREATE INDEX idx_quiz_question_quiz ON public.quiz_question USING btree (quiz_id);

ALTER TABLE ONLY public.quiz_question
    ADD CONSTRAINT quiz_question_original_question_id_fkey FOREIGN KEY (original_question_id) REFERENCES public.question(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.quiz_question
    ADD CONSTRAINT quiz_question_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;
