CREATE TABLE public.quiz_note (
    quiz_id integer NOT NULL,
    note_id integer NOT NULL
);

ALTER TABLE ONLY public.quiz_note
    ADD CONSTRAINT quiz_note_pkey PRIMARY KEY (quiz_id, note_id);

CREATE INDEX idx_quiz_note_note ON public.quiz_note USING btree (note_id);

ALTER TABLE ONLY public.quiz_note
    ADD CONSTRAINT quiz_note_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.note(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.quiz_note
    ADD CONSTRAINT quiz_note_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;
