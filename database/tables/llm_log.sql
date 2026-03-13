CREATE TABLE public.llm_log (
    id integer NOT NULL,
    user_id integer,
    request_type character varying(30) NOT NULL,
    prompt text NOT NULL,
    response text,
    tokens_used integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT llm_log_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['explain'::character varying, 'generate_questions'::character varying, 'summarize'::character varying, 'grammar_check'::character varying])::text[])))
);

CREATE SEQUENCE public.llm_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.llm_log_id_seq OWNED BY public.llm_log.id;

ALTER TABLE ONLY public.llm_log ALTER COLUMN id SET DEFAULT nextval('public.llm_log_id_seq'::regclass);

ALTER TABLE ONLY public.llm_log
    ADD CONSTRAINT llm_log_pkey PRIMARY KEY (id);

CREATE INDEX idx_llm_log_created ON public.llm_log USING btree (created_at);

CREATE INDEX idx_llm_log_type ON public.llm_log USING btree (request_type);

CREATE INDEX idx_llm_log_user ON public.llm_log USING btree (user_id);

ALTER TABLE ONLY public.llm_log
    ADD CONSTRAINT llm_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
