alter table public.profiles
  add column referral_code text,
  add column referred_by_user_id uuid references public.profiles(id) on delete set null,
  add column acquisition_source_code text;

alter table public.profiles add constraint profiles_cannot_refer_self
  check (referred_by_user_id is null or referred_by_user_id <> id);

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
begin
  code_base := regexp_replace(upper(
    coalesce(nullif(name_parts[1], ''), 'USER') ||
    case when array_length(name_parts, 1) > 1 then left(name_parts[array_length(name_parts, 1)], 1) else '' end
  ), '[^A-Z0-9]', '', 'g');
  if code_base = '' then code_base := 'USER'; end if;
  for attempt in 1..100 loop
    candidate := left(code_base, 14) || lpad(floor(random() * 100000)::integer::text, 5, '0');
    if not exists (select 1 from public.profiles where referral_code = candidate) then return candidate; end if;
  end loop;
  return left(code_base, 10) || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 10));
end;
$$;

do $$
declare existing_profile record;
begin
  for existing_profile in select id, full_name from public.profiles where referral_code is null loop
    update public.profiles set referral_code = private.generate_referral_code(existing_profile.full_name) where id = existing_profile.id;
  end loop;
end $$;

alter table public.profiles alter column referral_code set not null;
create unique index profiles_referral_code_unique_ci on public.profiles (upper(referral_code));
create index profiles_referred_by_user_idx on public.profiles (referred_by_user_id) where referred_by_user_id is not null;
create index profiles_acquisition_source_idx on public.profiles (upper(acquisition_source_code));

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  captured_code text := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer_id uuid;
  generated_code text;
  supplied_name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  if captured_code is not null then
    select id into referrer_id from public.profiles where upper(referral_code) = captured_code limit 1;
  end if;
  generated_code := private.generate_referral_code(supplied_name);
  insert into public.profiles (id, email, role, status, full_name, onboarding_step, referral_code, referred_by_user_id, acquisition_source_code)
  values (new.id, lower(new.email), 'student', 'active', supplied_name, 'verify_email', generated_code, referrer_id, coalesce(captured_code, 'DIRECT'))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.get_my_referrals()
returns table (user_id uuid, full_name text, joined_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.full_name, p.created_at
  from public.profiles p
  where p.referred_by_user_id = (select auth.uid())
  order by p.created_at desc;
$$;

revoke all on function public.get_my_referrals() from public, anon;
grant execute on function public.get_my_referrals() to authenticated;

comment on column public.profiles.referral_code is 'Immutable, unique personal referral code generated when the account is created.';
comment on column public.profiles.acquisition_source_code is 'Raw referral or campaign source captured from the registration URL; DIRECT when absent.';
