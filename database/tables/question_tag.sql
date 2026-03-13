CREATE TABLE public.question_tag (
    question_id integer NOT NULL,
    tag_id integer NOT NULL
);

ALTER TABLE ONLY public.question_tag
    ADD CONSTRAINT question_tag_pkey PRIMARY KEY (question_id, tag_id);

CREATE INDEX idx_question_tag_tag ON public.question_tag USING btree (tag_id);

ALTER TABLE ONLY public.question_tag
    ADD CONSTRAINT question_tag_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_tag
    ADD CONSTRAINT question_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tag(id) ON DELETE CASCADE;
