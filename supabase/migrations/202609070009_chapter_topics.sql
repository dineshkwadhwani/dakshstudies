begin;

-- Topic summaries are database content, not publicly bundled files.
create function public.topic_summary_word_count(html text)
returns integer language sql immutable set search_path = '' as $$
  select case when cleaned = '' then 0
    else cardinality(regexp_split_to_array(cleaned, '\s+')) end
  from (select regexp_replace(regexp_replace(regexp_replace(coalesce(html, ''), '<[^>]*>', ' ', 'g'),
    '&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);', ' ', 'g'), '^\s+|\s+$', '', 'g') as cleaned) words
$$;

create table public.chapter_topics (
  id uuid primary key default extensions.gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  summary_html text not null default '' check (length(summary_html) <= 30000),
  word_count integer generated always as (public.topic_summary_word_count(summary_html)) stored,
  status public.content_status not null default 'draft',
  source_book text,
  source_file text,
  source_section text,
  source_page_start integer check (source_page_start > 0),
  source_page_end integer check (source_page_end >= source_page_start),
  source_sha256 text,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, slug),
  constraint published_topic_summary_length check (status <> 'published' or word_count between 200 and 500),
  -- No attributes, scripts, embeds, URLs or executable markup are accepted.
  constraint topic_summary_safe_markup check (
    regexp_replace(summary_html, '</?(p|h2|h3|strong|em|ul|ol|li|sub|sup|blockquote)>|<br\s*/?>', '', 'g') !~ '[<>]'
  )
);

create index chapter_topics_chapter_order_idx on public.chapter_topics(chapter_id, sort_order, id);
create trigger set_updated_at before update on public.chapter_topics
for each row execute function private.set_updated_at();

alter table public.chapter_topics enable row level security;
revoke all on public.chapter_topics from anon, authenticated;
grant select, insert, update, delete on public.chapter_topics to authenticated;
grant all on public.chapter_topics to service_role;

create policy "SuperAdmin manages chapter topics" on public.chapter_topics
for all to authenticated
using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "Students read published entitled topics" on public.chapter_topics
for select to authenticated using (
  status = 'published'
  and (select private.current_profile_role()) = 'student'
  and exists (
    select 1 from public.chapters chapter
    join public.subjects subject on subject.id = chapter.subject_id
    join public.curricula curriculum on curriculum.id = subject.curriculum_id
    join public.student_entitlements entitlement on entitlement.academic_year_id = curriculum.academic_year_id
    join public.package_features package_feature on package_feature.package_id = entitlement.package_id
    join public.features feature on feature.id = package_feature.feature_id
    where chapter.id = chapter_topics.chapter_id
      and chapter.status = 'published' and subject.status = 'published' and curriculum.status = 'published'
      and entitlement.student_id = (select auth.uid()) and entitlement.status = 'active'
      and now() >= entitlement.starts_at and now() < entitlement.ends_at
      and package_feature.enabled and feature.code = 'learning_content'
  )
);

commit;
