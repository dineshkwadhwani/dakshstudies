alter table public.packages
  add column quiz_attempts_per_chapter integer check (quiz_attempts_per_chapter is null or quiz_attempts_per_chapter > 0),
  add column quiz_attempt_fixed_limit integer check (quiz_attempt_fixed_limit is null or quiz_attempt_fixed_limit > 0);

update public.packages set
  quiz_attempts_per_chapter = case code when 'BASIC' then 2 when 'PRO' then 6 else null end,
  quiz_attempt_fixed_limit = case code when 'FREE' then 10 else null end;

alter table public.packages add constraint packages_quiz_allowance_mode check (
  (quiz_attempts_per_chapter is not null and quiz_attempt_fixed_limit is null)
  or (quiz_attempts_per_chapter is null and quiz_attempt_fixed_limit is not null)
);

create or replace function private.quiz_allowance_for(student_uuid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare entitlement record; chapter_count integer; allowance integer; used_count integer;
begin
  select e.academic_year_id,e.starts_at,e.ends_at,p.id package_id,p.code,p.name,
    p.quiz_attempts_per_chapter,p.quiz_attempt_fixed_limit
  into entitlement
  from public.student_entitlements e join public.packages p on p.id=e.package_id
  where e.student_id=student_uuid and e.status='active' and now()>=e.starts_at and now()<e.ends_at
  order by p.rank desc,e.created_at desc limit 1;
  if entitlement.package_id is null then return jsonb_build_object('allowed',false,'used',0,'limit',0,'remaining',0); end if;

  select count(*) into chapter_count from public.chapters c join public.subjects s on s.id=c.subject_id
    join public.curricula cu on cu.id=s.curriculum_id
    where c.status='published' and s.status='published' and cu.academic_year_id=entitlement.academic_year_id;
  allowance := coalesce(entitlement.quiz_attempt_fixed_limit,entitlement.quiz_attempts_per_chapter*chapter_count);

  select count(*) into used_count from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id
  where aa.student_id=student_uuid and aa.status='submitted' and aa.mode in ('practice','test')
    and a.assessment_type='practice_quiz'
    and aa.submitted_at >= (select starts_on::timestamptz from public.academic_years where id=entitlement.academic_year_id)
    and aa.submitted_at < ((select ends_on from public.academic_years where id=entitlement.academic_year_id)+1)::timestamptz;

  return jsonb_build_object('allowed',used_count<allowance,'used',used_count,'limit',allowance,
    'remaining',greatest(allowance-used_count,0),'packageId',entitlement.package_id,
    'packageCode',entitlement.code,'packageName',entitlement.name,'chapterCount',chapter_count,
    'attemptsPerChapter',entitlement.quiz_attempts_per_chapter,'fixedLimit',entitlement.quiz_attempt_fixed_limit);
end $$;

create or replace function public.get_my_quiz_allowance()
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.quiz_allowance_for(auth.uid())
$$;

create or replace function private.enforce_quiz_allowance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare allowance jsonb; is_chapter_quiz boolean;
begin
  select exists(select 1 from public.assessments a where a.id=new.assessment_id and a.assessment_type='practice_quiz') into is_chapter_quiz;
  if not is_chapter_quiz or new.mode not in ('practice','test') then return new; end if;
  if tg_op='INSERT' or (tg_op='UPDATE' and old.status<>'submitted' and new.status='submitted') then
    perform pg_advisory_xact_lock(hashtext(new.student_id::text));
    allowance := private.quiz_allowance_for(new.student_id);
    if not coalesce((allowance->>'allowed')::boolean,false) then
      raise exception 'QUIZ_ALLOWANCE_REACHED:%',allowance->>'limit' using errcode='P0001';
    end if;
  end if;
  return new;
end $$;

create trigger enforce_quiz_allowance_on_attempt
before insert or update of status on public.assessment_attempts
for each row execute function private.enforce_quiz_allowance();

revoke all on function public.get_my_quiz_allowance() from public,anon;
grant execute on function public.get_my_quiz_allowance() to authenticated;
