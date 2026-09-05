-- Major authentication events for the SuperAdmin audit page.
create or replace function private.audit_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    event_type, affected_user_id, entity_type, entity_id, outcome, metadata
  ) values (
    'user.created', new.id, 'profile', new.id, 'success',
    jsonb_build_object('role', new.role, 'source', 'database')
  );
  return new;
end;
$$;

drop trigger if exists audit_profile_created on public.profiles;
create trigger audit_profile_created
after insert on public.profiles
for each row execute function private.audit_new_profile();

create or replace function public.record_own_login()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_role public.app_role;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select role into profile_role from public.profiles where id = auth.uid();
  insert into public.audit_events (
    event_type, actor_user_id, actor_role, affected_user_id,
    entity_type, entity_id, outcome, metadata
  ) values (
    'user.logged_in', auth.uid(), profile_role, auth.uid(),
    'profile', auth.uid(), 'success', jsonb_build_object('source', 'authenticated-client')
  );
end;
$$;

revoke all on function public.record_own_login() from public, anon;
grant execute on function public.record_own_login() to authenticated;

