CREATE TABLE public.quiz_tag (
    quiz_id integer NOT NULL,
    tag_id integer NOT NULL
);

ALTER TABLE ONLY public.quiz_tag
    ADD CONSTRAINT quiz_tag_pkey PRIMARY KEY (quiz_id, tag_id);

CREATE INDEX idx_quiz_tag_tag ON public.quiz_tag USING btree (tag_id);

ALTER TABLE ONLY public.quiz_tag
    ADD CONSTRAINT quiz_tag_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.quiz_tag
    ADD CONSTRAINT quiz_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tag(id) ON DELETE CASCADE;
