-- Keep a queryable application email while auth.users remains the identity
-- source of truth. This supports notification and reporting workflows without
-- exposing the Auth schema to browser clients.
alter table public.profiles add column email text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id;

alter table public.profiles
  add constraint profiles_email_format check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

create unique index profiles_email_unique_ci
on public.profiles (lower(email))
where email is not null;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role, status, full_name, onboarding_step)
  values (new.id, lower(new.email), 'student', 'active', nullif(new.raw_user_meta_data ->> 'full_name', ''), 'verify_email')
  on conflict (id) do update set email = excluded.email;
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
  if new.email is distinct from old.email then
    update public.profiles
    set email = lower(new.email)
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function private.sync_auth_user_email();

