CREATE TABLE public.user_source_progress (
    id integer NOT NULL,
    user_id integer NOT NULL,
    source_id integer NOT NULL,
    last_position text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.user_source_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_source_progress_id_seq OWNED BY public.user_source_progress.id;

ALTER TABLE ONLY public.user_source_progress ALTER COLUMN id SET DEFAULT nextval('public.user_source_progress_id_seq'::regclass);

ALTER TABLE ONLY public.user_source_progress
    ADD CONSTRAINT user_source_progress_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_source_progress
    ADD CONSTRAINT user_source_progress_user_id_source_id_key UNIQUE (user_id, source_id);

CREATE INDEX idx_progress_source ON public.user_source_progress USING btree (source_id);

CREATE INDEX idx_progress_user ON public.user_source_progress USING btree (user_id);

ALTER TABLE ONLY public.user_source_progress
    ADD CONSTRAINT user_source_progress_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_source_progress
    ADD CONSTRAINT user_source_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
