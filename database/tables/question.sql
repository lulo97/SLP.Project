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

CREATE SEQUENCE public.question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.question_id_seq OWNED BY public.question.id;

ALTER TABLE ONLY public.question ALTER COLUMN id SET DEFAULT nextval('public.question_id_seq'::regclass);

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_pkey PRIMARY KEY (id);

CREATE INDEX idx_question_fts ON public.question USING gin (to_tsvector('english'::regconfig, content));

CREATE INDEX idx_question_metadata ON public.question USING gin (metadata);

CREATE INDEX idx_question_type ON public.question USING btree (type);

CREATE INDEX idx_question_user ON public.question USING btree (user_id);

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
