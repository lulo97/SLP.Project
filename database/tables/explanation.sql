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

CREATE SEQUENCE public.explanation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.explanation_id_seq OWNED BY public.explanation.id;

ALTER TABLE ONLY public.explanation ALTER COLUMN id SET DEFAULT nextval('public.explanation_id_seq'::regclass);

ALTER TABLE ONLY public.explanation
    ADD CONSTRAINT explanation_pkey PRIMARY KEY (id);

CREATE INDEX idx_explanation_source ON public.explanation USING btree (source_id);

CREATE INDEX idx_explanation_user ON public.explanation USING btree (user_id);

ALTER TABLE ONLY public.explanation
    ADD CONSTRAINT explanation_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.explanation
    ADD CONSTRAINT explanation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
