-- Browser management permissions remain protected by RLS and are available
-- only to an authenticated active SuperAdmin.
grant insert, update, delete on public.subjects, public.chapters,
  public.content_resources, public.content_resource_versions to authenticated;
grant update (role, status) on public.profiles to authenticated;
grant update on public.packages to authenticated;

create policy "SuperAdmin manages subjects" on public.subjects
for all to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy "SuperAdmin manages chapters" on public.chapters
for all to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy "SuperAdmin manages content resources" on public.content_resources
for all to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy "SuperAdmin manages content versions" on public.content_resource_versions
for all to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy "SuperAdmin updates user administration fields" on public.profiles
for update to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy "SuperAdmin manages packages" on public.packages
for update to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy "SuperAdmin uploads learning content files" on storage.objects
for insert to authenticated with check (bucket_id = 'learning-content' and (select private.is_super_admin()));
create policy "SuperAdmin replaces learning content files" on storage.objects
for update to authenticated using (bucket_id = 'learning-content' and (select private.is_super_admin()))
with check (bucket_id = 'learning-content' and (select private.is_super_admin()));
create policy "SuperAdmin deletes learning content files" on storage.objects
for delete to authenticated using (bucket_id = 'learning-content' and (select private.is_super_admin()));

