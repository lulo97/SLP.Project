CREATE TABLE public.report (
    id integer NOT NULL,
    user_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    reason text NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_by integer,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['quiz'::character varying, 'question'::character varying, 'comment'::character varying])::text[])))
);

CREATE SEQUENCE public.report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.report_id_seq OWNED BY public.report.id;

ALTER TABLE ONLY public.report ALTER COLUMN id SET DEFAULT nextval('public.report_id_seq'::regclass);

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_pkey PRIMARY KEY (id);

CREATE INDEX idx_report_created ON public.report USING btree (created_at);

CREATE INDEX idx_report_resolved ON public.report USING btree (resolved);

CREATE INDEX idx_report_target ON public.report USING btree (target_type, target_id);

CREATE INDEX idx_report_user_id ON public.report USING btree (user_id);

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
