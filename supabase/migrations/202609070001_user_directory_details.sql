create or replace function public.get_user_directory_details(user_id_input uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  email_verified boolean,
  status public.account_status,
  role public.app_role,
  phone text,
  city text,
  package_name text,
  package_code text,
  entitlement_status public.entitlement_status,
  package_ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_role public.app_role;
begin
  caller_role := private.current_profile_role();

  if caller_role is null then
    raise exception 'Authentication required';
  end if;

  if caller_role <> 'super_admin' and not (
    caller_role = 'account_manager'
    and exists (
      select 1
      from public.profiles target
      where target.id = user_id_input
        and target.role = 'student'
    )
  ) then
    raise exception 'Access denied';
  end if;

  return query
  select
    target.id,
    target.full_name,
    target.email,
    target.email_verified,
    target.status,
    target.role,
    target.phone,
    target.city,
    package.name,
    package.code,
    entitlement.status,
    entitlement.ends_at
  from public.profiles target
  left join lateral (
    select item.package_id, item.status, item.ends_at
    from public.student_entitlements item
    where item.student_id = target.id
    order by
      case
        when item.status = 'active'
          and now() >= item.starts_at
          and now() < item.ends_at then 0
        else 1
      end,
      item.created_at desc
    limit 1
  ) entitlement on true
  left join public.packages package on package.id = entitlement.package_id
  where target.id = user_id_input;
end;
$$;

revoke all on function public.get_user_directory_details(uuid) from public;
revoke all on function public.get_user_directory_details(uuid) from anon;
grant execute on function public.get_user_directory_details(uuid) to authenticated;
