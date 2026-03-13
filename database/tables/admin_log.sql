CREATE TABLE public.admin_log (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    action character varying(50) NOT NULL,
    target_type character varying(20),
    target_id integer,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.admin_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.admin_log_id_seq OWNED BY public.admin_log.id;

ALTER TABLE ONLY public.admin_log ALTER COLUMN id SET DEFAULT nextval('public.admin_log_id_seq'::regclass);

ALTER TABLE ONLY public.admin_log
    ADD CONSTRAINT admin_log_pkey PRIMARY KEY (id);

CREATE INDEX idx_admin_log_admin ON public.admin_log USING btree (admin_id);

CREATE INDEX idx_admin_log_created ON public.admin_log USING btree (created_at);

ALTER TABLE ONLY public.admin_log
    ADD CONSTRAINT admin_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;
