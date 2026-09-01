begin;

-- Stable natural keys used by the idempotent curriculum importer.
alter table public.question_banks
  add constraint question_banks_chapter_name_key unique (chapter_id, name);

commit;
