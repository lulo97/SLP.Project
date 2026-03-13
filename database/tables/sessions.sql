CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id integer NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp without time zone,
    expires_at timestamp without time zone,
    revoked boolean DEFAULT false,
    ip_address text,
    user_agent text
);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
