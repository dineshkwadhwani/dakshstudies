create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_code text := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer_id uuid;
  generated_code text;
  supplied_name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  supplied_phone text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  supplied_package text := upper(nullif(trim(new.raw_user_meta_data ->> 'selected_package'), ''));
  is_admin_provisioned boolean := coalesce(new.raw_app_meta_data ->> 'provisioned_role', '') = 'account_manager';
begin
  if supplied_name is null or supplied_name !~ '^[[:alpha:]][[:alpha:][:space:].''-]{1,79}$' then
    raise exception 'A valid full name is required';
  end if;

  if not is_admin_provisioned and (supplied_phone is null or supplied_phone !~ '^\+91[6-9][0-9]{9}$') then
    raise exception 'A valid 10-digit Indian mobile number is required';
  end if;

  if supplied_code is not null and supplied_code !~ '^[A-Z0-9]{3,20}$' then
    raise exception 'The referral code format is not valid';
  end if;

  if not is_admin_provisioned and supplied_package not in ('FREE', 'BASIC', 'PRO') then
    raise exception 'A valid package is required';
  end if;

  if not is_admin_provisioned and supplied_code is not null then
    select id into referrer_id
    from public.profiles
    where upper(referral_code) = supplied_code
      and status = 'active'
    limit 1;
  end if;

  if not is_admin_provisioned and supplied_code is not null and referrer_id is null then
    raise exception 'The referral code is not valid';
  end if;

  generated_code := private.generate_referral_code(supplied_name);
  insert into public.profiles (
    id, email, email_verified, role, status, full_name, phone, onboarding_step,
    referral_code, referred_by_user_id, acquisition_source_code
  ) values (
    new.id, lower(new.email), new.email_confirmed_at is not null, 'student', 'active',
    supplied_name, supplied_phone, 'verify_email', generated_code, referrer_id,
    case when is_admin_provisioned or supplied_code is null then 'DIRECT' else supplied_code end
  )
  on conflict (id) do update set
    email = excluded.email,
    email_verified = excluded.email_verified,
    full_name = excluded.full_name,
    phone = excluded.phone;
  return new;
end;
$$;
