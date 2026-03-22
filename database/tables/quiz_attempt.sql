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

CREATE SEQUENCE public.quiz_attempt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.quiz_attempt_id_seq OWNED BY public.quiz_attempt.id;

ALTER TABLE ONLY public.quiz_attempt ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempt_id_seq'::regclass);

ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_pkey PRIMARY KEY (id);

CREATE INDEX idx_attempt_quiz ON public.quiz_attempt USING btree (quiz_id);

CREATE INDEX idx_attempt_start ON public.quiz_attempt USING btree (start_time);

CREATE INDEX idx_attempt_status ON public.quiz_attempt USING btree (status);

CREATE INDEX idx_attempt_user ON public.quiz_attempt USING btree (user_id);

ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
