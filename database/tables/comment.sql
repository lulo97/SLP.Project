CREATE TABLE public.comment (
    id integer NOT NULL,
    user_id integer NOT NULL,
    parent_id integer,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    content text NOT NULL,
    deleted_at timestamp with time zone,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT comment_target_type_check CHECK (((target_type)::text = ANY (ARRAY[('quiz'::character varying)::text, ('source'::character varying)::text, ('question'::character varying)::text])))
);

CREATE SEQUENCE public.comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.comment_id_seq OWNED BY public.comment.id;

ALTER TABLE ONLY public.comment ALTER COLUMN id SET DEFAULT nextval('public.comment_id_seq'::regclass);

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_pkey PRIMARY KEY (id);

CREATE INDEX idx_comment_created ON public.comment USING btree (created_at);

CREATE INDEX idx_comment_deleted ON public.comment USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_comment_parent ON public.comment USING btree (parent_id);

CREATE INDEX idx_comment_target ON public.comment USING btree (target_type, target_id);

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comment(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
