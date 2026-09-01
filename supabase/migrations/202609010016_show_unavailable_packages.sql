-- Published packages remain visible for marketing. sale_enabled controls whether
-- a new customer may select the package, rather than whether it can be seen.
drop policy if exists "Public can view sale packages" on public.packages;
create policy "Public can view published packages"
on public.packages for select to anon, authenticated
using (status = 'published');
