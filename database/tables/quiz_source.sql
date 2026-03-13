CREATE TABLE public.quiz_source (
    quiz_id integer NOT NULL,
    source_id integer NOT NULL
);

ALTER TABLE ONLY public.quiz_source
    ADD CONSTRAINT quiz_source_pkey PRIMARY KEY (quiz_id, source_id);

CREATE INDEX idx_quiz_source_source ON public.quiz_source USING btree (source_id);

ALTER TABLE ONLY public.quiz_source
    ADD CONSTRAINT quiz_source_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.quiz_source
    ADD CONSTRAINT quiz_source_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(id) ON DELETE CASCADE;
