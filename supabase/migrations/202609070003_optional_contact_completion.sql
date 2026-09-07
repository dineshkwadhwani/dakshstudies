create or replace function public.update_my_contact_details(
  phone_input text default null,
  city_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  actor_app_role public.app_role;
  clean_phone text := nullif(trim(phone_input), '');
  clean_city text := nullif(regexp_replace(trim(city_input), '[[:space:]]+', ' ', 'g'), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select role into actor_app_role
  from public.profiles
  where id = current_user_id and status = 'active';

  if actor_app_role is null then
    raise exception 'Active profile not found';
  end if;

  if clean_phone is null and clean_city is null then
    raise exception 'Enter a phone number or city';
  end if;

  if clean_phone is not null and clean_phone !~ '^\+91[6-9][0-9]{9}$' then
    raise exception 'Enter a valid 10-digit Indian mobile number';
  end if;

  if clean_city is not null and (char_length(clean_city) < 2 or char_length(clean_city) > 80 or clean_city !~ '^[[:alpha:]][[:alpha:][:space:].''-]*$') then
    raise exception 'Enter a valid city name';
  end if;

  update public.profiles
  set phone = coalesce(clean_phone, phone),
      city = coalesce(clean_city, city),
      updated_at = now()
  where id = current_user_id;

  insert into public.audit_events (
    event_type, actor_user_id, actor_role, affected_user_id, entity_type, entity_id, metadata
  ) values (
    'profile.contact_updated', current_user_id, actor_app_role, current_user_id, 'profile', current_user_id,
    jsonb_build_object('phone_updated', clean_phone is not null, 'city_updated', clean_city is not null)
  );

  return jsonb_build_object('updated', true);
end;
$$;

revoke all on function public.update_my_contact_details(text, text) from public;
revoke all on function public.update_my_contact_details(text, text) from anon;
grant execute on function public.update_my_contact_details(text, text) to authenticated;
