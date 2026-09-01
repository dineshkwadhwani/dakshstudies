-- Sale-disabled packages remain visible to SuperAdmin for configuration, while
-- anonymous and student catalogue reads still see sale-enabled packages only.
create policy "SuperAdmin views every package"
on public.packages for select to authenticated
using ((select private.is_super_admin()));

