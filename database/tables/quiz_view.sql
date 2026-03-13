CREATE TABLE public.quiz_view (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    ip_address inet NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    viewed_hour timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.quiz_view_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.quiz_view_id_seq OWNED BY public.quiz_view.id;

ALTER TABLE ONLY public.quiz_view ALTER COLUMN id SET DEFAULT nextval('public.quiz_view_id_seq'::regclass);

ALTER TABLE ONLY public.quiz_view
    ADD CONSTRAINT quiz_view_pkey PRIMARY KEY (id);

CREATE INDEX idx_quiz_view_ip ON public.quiz_view USING btree (ip_address);

CREATE INDEX idx_quiz_view_quiz ON public.quiz_view USING btree (quiz_id);

CREATE UNIQUE INDEX idx_quiz_view_unique_hour ON public.quiz_view USING btree (quiz_id, ip_address, viewed_hour);

CREATE INDEX idx_quiz_view_viewed ON public.quiz_view USING btree (viewed_at);

ALTER TABLE ONLY public.quiz_view
    ADD CONSTRAINT quiz_view_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;
