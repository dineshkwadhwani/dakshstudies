begin;

create or replace function public.complete_student_onboarding(
  full_name_input text,
  phone_input text,
  school_name_input text,
  city_input text,
  date_of_birth_input date,
  target_exam_date_input date,
  parent_name_input text default null,
  parent_email_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  cbse_id uuid;
  class_ten_id uuid;
  current_year_id uuid;
  free_package public.packages%rowtype;
  entitlement_id uuid;
  duplicate_trial boolean;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from auth.users u where u.id = current_user_id and u.email_confirmed_at is not null
  ) then raise exception 'Email verification required'; end if;
  if nullif(trim(full_name_input), '') is null or nullif(trim(phone_input), '') is null or
     nullif(trim(school_name_input), '') is null or nullif(trim(city_input), '') is null or
     date_of_birth_input is null or target_exam_date_input is null then
    raise exception 'All required profile fields must be completed';
  end if;

  select id into cbse_id from public.boards where code = 'CBSE';
  select id into class_ten_id from public.grades where code = '10';
  select id into current_year_id from public.academic_years where is_current limit 1;
  if cbse_id is null or class_ten_id is null or current_year_id is null then
    raise exception 'Academic configuration is incomplete';
  end if;

  update public.profiles
  set full_name = trim(full_name_input), phone = trim(phone_input), school_name = trim(school_name_input),
      city = trim(city_input), date_of_birth = date_of_birth_input, grade_id = class_ten_id,
      board_id = cbse_id, target_exam_date = target_exam_date_input, onboarding_step = 'complete',
      updated_at = now()
  where id = current_user_id and role = 'student' and status = 'active';
  if not found then raise exception 'Active student profile not found'; end if;

  if nullif(trim(parent_email_input), '') is not null then
    update public.parent_contacts set active = false, updated_at = now()
    where student_id = current_user_id and active;
    insert into public.parent_contacts(student_id, parent_name, email, verification_status, active)
    values (current_user_id, nullif(trim(parent_name_input), ''), lower(trim(parent_email_input)), 'pending', true);
  end if;

  select exists (
    select 1
    from public.profiles p
    join public.student_entitlements e on e.student_id = p.id and e.source = 'trial'
    where p.phone = trim(phone_input) and p.id <> current_user_id
  ) into duplicate_trial;

  if not duplicate_trial and not exists (
    select 1 from public.student_entitlements e where e.student_id = current_user_id and e.source = 'trial'
  ) then
    select p.* into free_package from public.packages p
    where p.academic_year_id = current_year_id and p.code = 'FREE' and p.sale_enabled and p.status = 'published'
    limit 1;
    if free_package.id is not null then
      insert into public.student_entitlements(student_id, package_id, academic_year_id, source, starts_at, ends_at, status)
      values (current_user_id, free_package.id, current_year_id, 'trial', now(), now() + make_interval(days => free_package.trial_days), 'active')
      returning id into entitlement_id;
    end if;
  end if;

  insert into public.audit_events(event_type, actor_user_id, actor_role, affected_user_id, entity_type, entity_id, metadata)
  values ('student.onboarding.completed', current_user_id, 'student', current_user_id, 'profile', current_user_id,
    jsonb_build_object('trial_granted', entitlement_id is not null, 'duplicate_trial_phone', duplicate_trial,
      'parent_contact_added', nullif(trim(parent_email_input), '') is not null));

  return jsonb_build_object('profile_complete', true, 'trial_granted', entitlement_id is not null,
    'duplicate_trial_phone', duplicate_trial, 'entitlement_id', entitlement_id);
end;
$$;

revoke all on function public.complete_student_onboarding(text,text,text,text,date,date,text,text) from public, anon;
grant execute on function public.complete_student_onboarding(text,text,text,text,date,date,text,text) to authenticated;

commit;
