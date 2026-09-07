-- CURRENT_ROLE is a PostgreSQL built-in expression, not the profile role.
-- Use an unambiguous variable so authenticated students pass the role checks.
create or replace function public.authorize_learning_resource(
  resource_version_id_input uuid,
  assessment_resource_id_input uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  actor_app_role public.app_role;
  version_row record;
  assessment_link record;
  required_feature text;
begin
  select role into actor_app_role
  from public.profiles
  where id = current_user_id and status = 'active';

  if actor_app_role is null then
    raise exception 'Active authentication required';
  end if;

  select
    version.id, version.storage_path, version.mime_type,
    resource.id as resource_id, resource.resource_type, resource.chapter_id
  into version_row
  from public.content_resource_versions version
  join public.content_resources resource on resource.id = version.resource_id
  where version.id = resource_version_id_input
    and version.version = resource.current_version
    and version.published_at is not null
    and resource.status = 'published';

  if version_row.id is null then
    raise exception 'Published resource not found';
  end if;

  if actor_app_role = 'super_admin' then
    return jsonb_build_object('storage_path', version_row.storage_path, 'mime_type', version_row.mime_type);
  end if;

  if actor_app_role <> 'student' then
    raise exception 'Student access required';
  end if;

  if exists (select 1 from public.assessment_resources link where link.resource_id = version_row.resource_id) then
    if assessment_resource_id_input is null then
      raise exception 'Assessment resource context required';
    end if;

    select link.id, link.purpose, assessment.id as assessment_id, assessment.answer_key_policy
    into assessment_link
    from public.assessment_resources link
    join public.assessments assessment on assessment.id = link.assessment_id
    where link.id = assessment_resource_id_input
      and link.resource_id = version_row.resource_id
      and assessment.status = 'published';

    if assessment_link.id is null then
      raise exception 'Published assessment resource not found';
    end if;

    if assessment_link.purpose = 'answer_key'
      and assessment_link.answer_key_policy = 'post_submission'
      and not exists (
        select 1 from public.assessment_attempts attempt
        where attempt.assessment_id = assessment_link.assessment_id
          and attempt.student_id = current_user_id
          and attempt.status = 'submitted'
      ) then
      raise exception 'Answer key is available after submission';
    end if;

    if assessment_link.purpose <> 'answer_key'
      and not exists (
        select 1 from public.assessment_attempts attempt
        where attempt.assessment_id = assessment_link.assessment_id
          and attempt.student_id = current_user_id
          and attempt.status in ('started', 'submitted')
      ) then
      raise exception 'Start the assessment before opening its resources';
    end if;

    required_feature := 'mock_tests';
  else
    if version_row.chapter_id is null or not exists (
      select 1
      from public.chapters chapter
      join public.subjects subject on subject.id = chapter.subject_id
      join public.curricula curriculum on curriculum.id = subject.curriculum_id
      where chapter.id = version_row.chapter_id
        and chapter.status = 'published'
        and subject.status = 'published'
        and curriculum.status = 'published'
    ) then
      raise exception 'Published chapter resource not found';
    end if;

    required_feature := case
      when version_row.resource_type in ('worksheet', 'worksheet_answer_key') then 'worksheets'
      when version_row.resource_type in ('test_paper', 'test_answer_key') then 'mock_tests'
      else 'learning_content'
    end;
  end if;

  if not exists (
    select 1
    from public.student_entitlements entitlement
    join public.package_features package_feature on package_feature.package_id = entitlement.package_id and package_feature.enabled
    join public.features feature on feature.id = package_feature.feature_id
    where entitlement.student_id = current_user_id
      and entitlement.status = 'active'
      and now() >= entitlement.starts_at
      and now() < entitlement.ends_at
      and feature.code = required_feature
  ) then
    raise exception 'Your package does not include this resource';
  end if;

  return jsonb_build_object('storage_path', version_row.storage_path, 'mime_type', version_row.mime_type);
end;
$$;

revoke all on function public.authorize_learning_resource(uuid, uuid) from public;
revoke all on function public.authorize_learning_resource(uuid, uuid) from anon;
grant execute on function public.authorize_learning_resource(uuid, uuid) to authenticated;

