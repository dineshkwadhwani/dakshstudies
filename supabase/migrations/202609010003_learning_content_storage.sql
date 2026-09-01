-- Permit entitled students and platform administrators to read learning files.
-- The bucket remains private; clients receive short-lived signed URLs.
create policy "Entitled users can read learning content files"
on storage.objects for select to authenticated
using (
  bucket_id = 'learning-content'
  and (
    (select private.is_super_admin())
    or (
      (select private.is_active_user())
      and (select private.has_active_entitlement((select auth.uid())))
    )
  )
);

