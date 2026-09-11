begin;

alter table public.chapter_topics
  drop constraint published_topic_summary_length,
  add constraint published_topic_summary_length
    check (status <> 'published' or word_count between 200 and 500);

commit;
