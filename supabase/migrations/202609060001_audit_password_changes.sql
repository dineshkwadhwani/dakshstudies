create or replace function public.record_own_password_change()
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
    'user.password_changed', auth.uid(), profile_role, auth.uid(),
    'profile', auth.uid(), 'success', jsonb_build_object('source', 'profile-security')
  );
end;
$$;

revoke all on function public.record_own_password_change() from public, anon;
grant execute on function public.record_own_password_change() to authenticated;

