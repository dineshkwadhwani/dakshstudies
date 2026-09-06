-- Account Managers can search the complete student directory, but must not
-- gain directory access to other staff or SuperAdmin profiles.
drop policy if exists "Users can view permitted profiles" on public.profiles;

create policy "Users can view permitted profiles"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.is_super_admin())
  or (
    (select private.current_profile_role()) = 'account_manager'
    and role = 'student'
  )
);

