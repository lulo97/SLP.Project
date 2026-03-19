CREATE TABLE public.metrics (
    id bigint NOT NULL,
    name text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    value double precision NOT NULL,
    tags text
);

CREATE SEQUENCE public.metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.metrics_id_seq OWNED BY public.metrics.id;

ALTER TABLE ONLY public.metrics ALTER COLUMN id SET DEFAULT nextval('public.metrics_id_seq'::regclass);

ALTER TABLE ONLY public.metrics
    ADD CONSTRAINT metrics_pkey PRIMARY KEY (id);

CREATE INDEX ix_metrics_name_timestamp ON public.metrics USING btree (name, "timestamp");
