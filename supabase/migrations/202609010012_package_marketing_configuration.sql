-- Marketing and commercial presentation controlled by SuperAdmin.
alter table public.packages
  add column original_price_paise integer check (original_price_paise is null or original_price_paise >= 0),
  add column show_offer boolean not null default false,
  add column display_features text[] not null default '{}'::text[];

alter table public.packages drop constraint if exists packages_quiz_allowance_mode;

alter table public.packages add constraint packages_offer_price_check check (
  not show_offer or (original_price_paise is not null and original_price_paise > price_paise)
);

update public.packages set
  quiz_attempt_fixed_limit = case code when 'FREE' then 10 when 'BASIC' then 100 when 'PRO' then 300 end,
  quiz_attempts_per_chapter = null,
  display_features = case code
    when 'FREE' then array['7-day access','Chapter summaries and notes','Worksheets and mock tests','10 quiz attempts','Personal study schedule']
    when 'BASIC' then array['Access for the academic year','All chapter summaries and notes','Worksheets and mock tests','100 quiz attempts','Progress reports']
    when 'PRO' then array['Access for the academic year','All chapter summaries and notes','Worksheets and mock tests','300 quiz attempts','Progress reports']
    else '{}'::text[]
  end;

comment on column public.packages.price_paise is 'Current selling price in the package currency.';
comment on column public.packages.original_price_paise is 'Optional pre-offer price shown struck through when show_offer is true.';
comment on column public.packages.display_features is 'Ordered marketing feature labels displayed on package cards.';
