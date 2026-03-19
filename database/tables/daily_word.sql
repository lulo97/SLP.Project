CREATE TABLE public.daily_word (
    id integer NOT NULL,
    word text NOT NULL,
    part_of_speech character varying(50),
    vietnamese_translation text,
    example text,
    origin text,
    fun_fact text,
    target_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE public.daily_word_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.daily_word_id_seq OWNED BY public.daily_word.id;

ALTER TABLE ONLY public.daily_word ALTER COLUMN id SET DEFAULT nextval('public.daily_word_id_seq'::regclass);

ALTER TABLE ONLY public.daily_word
    ADD CONSTRAINT daily_word_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.daily_word
    ADD CONSTRAINT daily_word_target_date_key UNIQUE (target_date);
