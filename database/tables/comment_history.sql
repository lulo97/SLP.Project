CREATE TABLE public.comment_history (
    id integer NOT NULL,
    comment_id integer NOT NULL,
    content text NOT NULL,
    edited_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.comment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.comment_history_id_seq OWNED BY public.comment_history.id;

ALTER TABLE ONLY public.comment_history ALTER COLUMN id SET DEFAULT nextval('public.comment_history_id_seq'::regclass);

ALTER TABLE ONLY public.comment_history
    ADD CONSTRAINT comment_history_pkey PRIMARY KEY (id);

CREATE INDEX idx_comment_history_comment ON public.comment_history USING btree (comment_id);

CREATE INDEX idx_comment_history_edited ON public.comment_history USING btree (edited_at);

ALTER TABLE ONLY public.comment_history
    ADD CONSTRAINT comment_history_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comment(id) ON DELETE CASCADE;
