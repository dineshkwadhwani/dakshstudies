-- Account Managers need directory visibility for user lookup and support.
-- Mutation permissions remain unchanged and are controlled by separate policies.
drop policy if exists "Users can view permitted profiles" on public.profiles;

create policy "Users can view permitted profiles"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.current_profile_role()) in ('super_admin', 'account_manager')
);

