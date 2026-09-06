alter table public.profiles
  add column if not exists email_verified boolean not null default false;

update public.profiles p
set email_verified = (u.email_confirmed_at is not null)
from auth.users u
where u.id = p.id;

create or replace function public.is_valid_referral_code(code_input text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(trim(code_input), '') is null or exists (
    select 1 from public.profiles
    where upper(referral_code) = upper(trim(code_input))
      and status = 'active'
  )
$$;

revoke all on function public.is_valid_referral_code(text) from public;
grant execute on function public.is_valid_referral_code(text) to anon, authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_code text := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer_id uuid;
  generated_code text;
  supplied_name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  if supplied_name is null or supplied_name !~ '^[[:alpha:]][[:alpha:][:space:].''-]{1,79}$' then
    raise exception 'A valid full name is required';
  end if;
  if supplied_code is not null then
    select id into referrer_id from public.profiles
    where upper(referral_code) = supplied_code and status = 'active' limit 1;
  end if;
  generated_code := private.generate_referral_code(supplied_name);
  insert into public.profiles (
    id, email, email_verified, role, status, full_name, onboarding_step,
    referral_code, referred_by_user_id, acquisition_source_code
  ) values (
    new.id, lower(new.email), new.email_confirmed_at is not null, 'student', 'active',
    supplied_name, 'verify_email', generated_code, referrer_id,
    case when referrer_id is null then 'DIRECT' else supplied_code end
  )
  on conflict (id) do update set
    email = excluded.email,
    email_verified = excluded.email_verified;
  return new;
end;
$$;

create or replace function private.sync_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = lower(new.email),
      email_verified = (new.email_confirmed_at is not null)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email, email_confirmed_at on auth.users
for each row execute function private.sync_auth_user_email();

