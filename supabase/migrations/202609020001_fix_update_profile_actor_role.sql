-- CURRENT_ROLE is a PostgreSQL built-in expression with type `name`. Using
-- current_role as a PL/pgSQL variable caused the audit insert to resolve the
-- built-in instead of the public.app_role value selected from the profile.
create or replace function public.update_my_profile(
  full_name_input text,
  phone_input text default null,
  school_name_input text default null,
  city_input text default null,
  date_of_birth_input date default null,
  target_exam_date_input date default null,
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
  actor_app_role public.app_role;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select role into actor_app_role from public.profiles where id = current_user_id and status = 'active';
  if actor_app_role is null then raise exception 'Active profile not found'; end if;
  if nullif(trim(full_name_input), '') is null then raise exception 'Full name is required'; end if;

  if actor_app_role = 'student' and (
    nullif(trim(phone_input), '') is null or nullif(trim(school_name_input), '') is null or
    nullif(trim(city_input), '') is null or date_of_birth_input is null or target_exam_date_input is null
  ) then raise exception 'Student profile fields must be completed'; end if;

  update public.profiles set
    full_name = trim(full_name_input), phone = nullif(trim(phone_input), ''),
    school_name = nullif(trim(school_name_input), ''), city = nullif(trim(city_input), ''),
    date_of_birth = date_of_birth_input, target_exam_date = target_exam_date_input,
    updated_at = now()
  where id = current_user_id;

  if actor_app_role = 'student' then
    update public.parent_contacts set active = false, updated_at = now()
    where student_id = current_user_id and active;
    if nullif(trim(parent_email_input), '') is not null then
      insert into public.parent_contacts(student_id, parent_name, email, verification_status, active)
      values (current_user_id, nullif(trim(parent_name_input), ''), lower(trim(parent_email_input)), 'pending', true);
    end if;
  end if;

  insert into public.audit_events(event_type, actor_user_id, actor_role, affected_user_id, entity_type, entity_id, metadata)
  values ('profile.updated', current_user_id, actor_app_role, current_user_id, 'profile', current_user_id,
    jsonb_build_object('parent_contact_configured', nullif(trim(parent_email_input), '') is not null));

  return jsonb_build_object('updated', true);
end;
$$;

revoke all on function public.update_my_profile(text,text,text,text,date,date,text,text) from public, anon;
grant execute on function public.update_my_profile(text,text,text,text,date,date,text,text) to authenticated;
