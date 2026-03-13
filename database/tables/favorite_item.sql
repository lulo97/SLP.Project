CREATE TABLE public.favorite_item (
    id integer NOT NULL,
    user_id integer NOT NULL,
    text text NOT NULL,
    type character varying(20) DEFAULT 'word'::character varying NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT favorite_item_type_check CHECK (((type)::text = ANY ((ARRAY['word'::character varying, 'phrase'::character varying, 'idiom'::character varying, 'other'::character varying])::text[])))
);

CREATE SEQUENCE public.favorite_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.favorite_item_id_seq OWNED BY public.favorite_item.id;

ALTER TABLE ONLY public.favorite_item ALTER COLUMN id SET DEFAULT nextval('public.favorite_item_id_seq'::regclass);

ALTER TABLE ONLY public.favorite_item
    ADD CONSTRAINT favorite_item_pkey PRIMARY KEY (id);

CREATE INDEX idx_favorite_fts ON public.favorite_item USING gin (to_tsvector('english'::regconfig, text));

CREATE INDEX idx_favorite_user ON public.favorite_item USING btree (user_id);

ALTER TABLE ONLY public.favorite_item
    ADD CONSTRAINT favorite_item_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
