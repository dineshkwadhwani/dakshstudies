create or replace function private.generate_referral_code(full_name_input text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  name_parts text[] := regexp_split_to_array(trim(coalesce(full_name_input, 'User')), '\s+');
  code_base text;
  candidate text;
  random_start integer := floor(random() * 100)::integer;
begin
  code_base := regexp_replace(upper(
    coalesce(nullif(name_parts[1], ''), 'USER') ||
    case when array_length(name_parts, 1) > 1 then left(name_parts[array_length(name_parts, 1)], 1) else '' end
  ), '[^A-Z0-9]', '', 'g');
  if code_base = '' then code_base := 'USER'; end if;

  -- Start randomly, then inspect every two-digit value so an available code
  -- cannot be missed because of repeated random selections.
  for attempt in 0..99 loop
    candidate := left(code_base, 14) || lpad(((random_start + attempt) % 100)::text, 2, '0');
    if not exists (select 1 from public.profiles where upper(referral_code) = upper(candidate)) then
      return candidate;
    end if;
  end loop;
  raise exception 'All two-digit referral codes are in use for %', code_base;
end;
$$;

-- Regenerate existing codes using the new memorable two-digit format.
do $$
declare existing_profile record;
begin
  for existing_profile in select id, full_name from public.profiles order by created_at loop
    update public.profiles
    set referral_code = private.generate_referral_code(existing_profile.full_name)
    where id = existing_profile.id;
  end loop;
end $$;

comment on column public.profiles.referral_code is
  'Immutable unique personal code: first name, surname initial, and a two-digit suffix.';
