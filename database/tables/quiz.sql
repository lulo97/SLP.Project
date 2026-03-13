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
    CONSTRAINT quiz_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying])::text[])))
);

CREATE SEQUENCE public.quiz_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.quiz_id_seq OWNED BY public.quiz.id;

ALTER TABLE ONLY public.quiz ALTER COLUMN id SET DEFAULT nextval('public.quiz_id_seq'::regclass);

ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_pkey PRIMARY KEY (id);

CREATE INDEX idx_quiz_created ON public.quiz USING btree (created_at);

CREATE INDEX idx_quiz_disabled ON public.quiz USING btree (disabled);

CREATE INDEX idx_quiz_user ON public.quiz USING btree (user_id);

CREATE INDEX idx_quiz_visibility ON public.quiz USING btree (visibility);

ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.note(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
