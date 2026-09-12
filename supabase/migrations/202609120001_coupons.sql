create table public.coupons (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  usage_type text not null default 'multiple' check (usage_type in ('one_time','multiple')),
  expires_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((discount_type = 'percentage' and discount_value <= 100) or discount_type = 'fixed')
);
create table public.coupon_redemptions (
  id uuid primary key default extensions.gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  payment_transaction_id uuid not null unique references public.payment_transactions(id) on delete restrict,
  discount_paise integer not null check (discount_paise > 0),
  created_at timestamptz not null default now(),
  unique(coupon_id, student_id)
);
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
create policy coupons_admin_all on public.coupons for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy coupons_student_read on public.coupons for select to authenticated using (active and expires_at > now());
create policy coupon_redemptions_admin_read on public.coupon_redemptions for select to authenticated using ((select private.is_super_admin()));
grant select on public.coupons to authenticated;
grant all on public.coupons to service_role;
grant all on public.coupon_redemptions to service_role;
