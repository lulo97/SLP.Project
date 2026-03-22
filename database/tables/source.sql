-- 1. Create the sequence first
CREATE SEQUENCE public.source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- 2. Create the table with the sequence linked as the default
CREATE TABLE public.source (
    id integer NOT NULL DEFAULT nextval('public.source_id_seq'),
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

-- 3. Ensure the sequence is dropped if the table is dropped
ALTER SEQUENCE public.source_id_seq OWNED BY public.source.id;

-- 4. Primary Key and Constraints
ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Indexes
CREATE INDEX idx_source_deleted ON public.source USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_source_fts ON public.source USING gin (to_tsvector('english'::regconfig, raw_text));
CREATE INDEX idx_source_metadata ON public.source USING gin (metadata);
CREATE INDEX idx_source_type ON public.source USING btree (type);
CREATE INDEX idx_source_user ON public.source USING btree (user_id);