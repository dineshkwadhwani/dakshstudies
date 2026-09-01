begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('super_admin', 'account_manager', 'student');
create type public.account_status as enum ('active', 'deactivated');
create type public.content_status as enum ('draft', 'processing', 'review', 'published', 'archived', 'failed');
create type public.entitlement_status as enum ('pending', 'active', 'expired', 'revoked');
create type public.plan_status as enum ('draft', 'active', 'archived');
create type public.task_status as enum ('scheduled', 'completed', 'missed', 'rescheduled', 'cancelled');
create type public.task_type as enum ('chapter_study', 'chapter_quiz', 'worksheet', 'mock_test');
create type public.assessment_type as enum ('practice_quiz', 'online_test', 'pdf_mock_test');
create type public.attempt_status as enum ('started', 'submitted', 'abandoned');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded');
create type public.notification_status as enum ('pending', 'queued', 'sent', 'failed', 'skipped');

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.boards (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grades (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order integer not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create unique index academic_years_one_current on public.academic_years (is_current) where is_current;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role public.app_role not null default 'student',
  status public.account_status not null default 'active',
  full_name text,
  phone text,
  school_name text,
  city text,
  date_of_birth date,
  grade_id uuid references public.grades(id) on delete restrict,
  board_id uuid references public.boards(id) on delete restrict,
  target_exam_date date,
  onboarding_step text not null default 'verify_email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_manager_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  account_manager_id uuid not null references public.profiles(id) on delete restrict,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  assigned_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (student_id <> account_manager_id),
  check (ends_at is null or ends_at > starts_at)
);
create unique index student_one_current_manager on public.student_manager_assignments(student_id) where ends_at is null;
create index manager_current_students on public.student_manager_assignments(account_manager_id, student_id) where ends_at is null;

create table public.parent_contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  parent_name text,
  email text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','expired','revoked')),
  verification_token_hash text,
  token_expires_at timestamptz,
  verified_at timestamptz,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index parent_one_active_contact on public.parent_contacts(student_id) where active;

create table public.account_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  from_status public.account_status,
  to_status public.account_status not null,
  reason text not null,
  changed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.curricula (
  id uuid primary key default extensions.gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete restrict,
  grade_id uuid not null references public.grades(id) on delete restrict,
  academic_year_id uuid references public.academic_years(id) on delete restrict,
  name text not null,
  version integer not null default 1,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(board_id, grade_id, academic_year_id, version)
);

create table public.subjects (
  id uuid primary key default extensions.gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete restrict,
  parent_subject_id uuid references public.subjects(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  color text,
  emoji text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(curriculum_id, slug)
);

create table public.chapters (
  id uuid primary key default extensions.gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  chapter_number integer not null,
  title text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subject_id, slug),
  unique(subject_id, chapter_number)
);

create table public.content_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  chapter_id uuid references public.chapters(id) on delete restrict,
  resource_type text not null check (resource_type in ('source_pdf','summary','notes','worksheet','worksheet_answer_key','test_paper','test_answer_key','other')),
  title text not null,
  description text,
  status public.content_status not null default 'draft',
  current_version integer not null default 1,
  sort_order integer not null default 0,
  legacy_id text unique,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_resource_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  resource_id uuid not null references public.content_resources(id) on delete restrict,
  version integer not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  checksum_sha256 text,
  provenance jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(resource_id, version),
  unique(storage_path)
);

create table public.ai_generation_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  source_version_id uuid not null references public.content_resource_versions(id) on delete restrict,
  output_types text[] not null,
  provider text not null,
  model text,
  prompt_version text,
  status public.content_status not null default 'processing',
  result_metadata jsonb not null default '{}'::jsonb,
  error_summary text,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_banks (
  id uuid primary key default extensions.gen_random_uuid(),
  chapter_id uuid references public.chapters(id) on delete restrict,
  subject_id uuid references public.subjects(id) on delete restrict,
  name text not null,
  bank_type text not null default 'mcq',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (chapter_id is not null or subject_id is not null)
);

create table public.questions (
  id uuid primary key default extensions.gen_random_uuid(),
  question_bank_id uuid not null references public.question_banks(id) on delete restrict,
  legacy_id text unique,
  current_version integer not null default 1,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete restrict,
  version integer not null,
  prompt text not null,
  explanation text,
  difficulty text check (difficulty is null or difficulty in ('easy','medium','hard')),
  topic text,
  status public.content_status not null default 'draft',
  provenance jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(question_id, version)
);

create table public.question_options (
  id uuid primary key default extensions.gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete restrict,
  option_text text not null,
  canonical_order smallint not null check (canonical_order >= 0),
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  unique(question_version_id, canonical_order)
);
create unique index question_one_correct_option on public.question_options(question_version_id) where is_correct;

create table public.assessments (
  id uuid primary key default extensions.gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete restrict,
  subject_id uuid references public.subjects(id) on delete restrict,
  chapter_id uuid references public.chapters(id) on delete restrict,
  title text not null,
  assessment_type public.assessment_type not null,
  maximum_marks numeric(8,2) not null check (maximum_marks > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  answer_key_policy text not null default 'post_submission' check (answer_key_policy in ('always','post_submission')),
  status public.content_status not null default 'draft',
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessment_sections (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  subject_id uuid references public.subjects(id) on delete restrict,
  title text not null,
  maximum_marks numeric(8,2) not null check (maximum_marks > 0),
  sort_order integer not null default 0,
  unique(assessment_id, sort_order)
);

create table public.assessment_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_section_id uuid not null references public.assessment_sections(id) on delete restrict,
  question_version_id uuid not null references public.question_versions(id) on delete restrict,
  sort_order integer not null,
  marks numeric(8,2) not null default 1 check (marks > 0),
  unique(assessment_section_id, sort_order),
  unique(assessment_section_id, question_version_id)
);

create table public.assessment_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  assessment_section_id uuid references public.assessment_sections(id) on delete restrict,
  resource_id uuid not null references public.content_resources(id) on delete restrict,
  purpose text not null check (purpose in ('question_paper','answer_key','supporting')),
  unique(assessment_id, assessment_section_id, purpose)
);

create table public.packages (
  id uuid primary key default extensions.gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  code text not null,
  name text not null,
  rank smallint not null check (rank >= 0),
  price_paise integer not null check (price_paise >= 0),
  currency char(3) not null default 'INR',
  package_type text not null check (package_type in ('trial','paid')),
  trial_days integer check (trial_days is null or trial_days > 0),
  fixed_expires_on date,
  sale_enabled boolean not null default true,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(academic_year_id, code),
  check ((package_type = 'trial' and trial_days is not null and price_paise = 0) or
         (package_type = 'paid' and fixed_expires_on is not null))
);

create table public.features (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.package_features (
  package_id uuid not null references public.packages(id) on delete restrict,
  feature_id uuid not null references public.features(id) on delete restrict,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  primary key(package_id, feature_id)
);

create table public.payment_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  package_id uuid not null references public.packages(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('purchase','upgrade')),
  amount_paise integer not null check (amount_paise >= 0),
  currency char(3) not null default 'INR',
  status public.payment_status not null default 'pending',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  parent_transaction_id uuid references public.payment_transactions(id) on delete restrict,
  idempotency_key text not null unique,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  package_id uuid not null references public.packages(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  source text not null check (source in ('trial','razorpay_purchase','razorpay_upgrade','admin_assignment','admin_extension')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.entitlement_status not null default 'active',
  source_payment_id uuid references public.payment_transactions(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete restrict,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index entitlements_student_effective on public.student_entitlements(student_id, status, starts_at, ends_at);

create table public.payment_webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  signature_verified boolean not null,
  processing_status text not null default 'pending' check (processing_status in ('pending','processed','failed','ignored')),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_summary text
);

create table public.refunds (
  id uuid primary key default extensions.gen_random_uuid(),
  payment_transaction_id uuid not null references public.payment_transactions(id) on delete restrict,
  amount_paise integer not null check (amount_paise > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  razorpay_refund_id text unique,
  initiated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status public.plan_status not null default 'draft',
  activated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create unique index study_plans_one_active on public.study_plans(student_id) where status = 'active';

create table public.schedule_tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  study_plan_id uuid not null references public.study_plans(id) on delete restrict,
  task_type public.task_type not null,
  due_on date not null,
  original_due_on date not null,
  chapter_id uuid references public.chapters(id) on delete restrict,
  resource_id uuid references public.content_resources(id) on delete restrict,
  assessment_id uuid references public.assessments(id) on delete restrict,
  status public.task_status not null default 'scheduled',
  overlap_confirmed boolean not null default false,
  completed_at timestamptz,
  missed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((task_type in ('chapter_study','chapter_quiz') and chapter_id is not null) or
         (task_type = 'worksheet' and resource_id is not null) or
         (task_type = 'mock_test' and assessment_id is not null))
);
create index schedule_tasks_plan_date on public.schedule_tasks(study_plan_id, due_on, status);

create table public.schedule_task_date_history (
  id uuid primary key default extensions.gen_random_uuid(),
  schedule_task_id uuid not null references public.schedule_tasks(id) on delete restrict,
  old_due_on date not null,
  new_due_on date not null,
  reason text,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.assessment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  schedule_task_id uuid references public.schedule_tasks(id) on delete restrict,
  status public.attempt_status not null default 'started',
  mode text not null default 'test' check (mode in ('practice','test','manual')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  score numeric(8,2),
  maximum_score numeric(8,2),
  percentage numeric(5,2),
  attempt_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, assessment_id, attempt_number)
);

create table public.attempt_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_attempt_id uuid not null references public.assessment_attempts(id) on delete restrict,
  question_version_id uuid references public.question_versions(id) on delete restrict,
  position integer not null,
  prompt_snapshot text not null,
  options_snapshot jsonb not null,
  correct_option_snapshot text,
  marks numeric(8,2) not null default 1,
  created_at timestamptz not null default now(),
  unique(assessment_attempt_id, position)
);

create table public.attempt_responses (
  id uuid primary key default extensions.gen_random_uuid(),
  attempt_question_id uuid not null unique references public.attempt_questions(id) on delete restrict,
  selected_option text,
  is_correct boolean,
  marks_awarded numeric(8,2),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.manual_test_scores (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_attempt_id uuid not null references public.assessment_attempts(id) on delete restrict,
  assessment_section_id uuid not null references public.assessment_sections(id) on delete restrict,
  marks numeric(8,2) not null check (marks >= 0),
  maximum_marks numeric(8,2) not null check (maximum_marks > 0 and marks <= maximum_marks),
  submitted_at timestamptz not null default now(),
  unique(assessment_attempt_id, assessment_section_id)
);

create table public.daily_parent_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  parent_contact_id uuid not null references public.parent_contacts(id) on delete restrict,
  report_date date not null,
  task_snapshot jsonb not null,
  status public.notification_status not null default 'pending',
  provider_message_id text unique,
  attempt_count integer not null default 0,
  error_category text,
  queued_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, report_date)
);

create table public.config_definitions (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  category text not null,
  value_type text not null check (value_type in ('boolean','integer','number','string','json')),
  default_value jsonb not null,
  client_visible boolean not null default false,
  delegatable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.config_values (
  config_definition_id uuid primary key references public.config_definitions(id) on delete restrict,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.config_delegations (
  id uuid primary key default extensions.gen_random_uuid(),
  account_manager_id uuid not null references public.profiles(id) on delete restrict,
  config_definition_id uuid not null references public.config_definitions(id) on delete restrict,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(account_manager_id, config_definition_id)
);

create table public.email_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null,
  version integer not null,
  subject_template text not null,
  html_template text not null,
  text_template text,
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(code, version)
);

create table public.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid references public.profiles(id) on delete restrict,
  actor_role public.app_role,
  affected_user_id uuid references public.profiles(id) on delete restrict,
  entity_type text,
  entity_id uuid,
  outcome text not null default 'success',
  changes jsonb,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 year')
);
create index audit_events_created on public.audit_events(created_at desc);
create index audit_events_actor on public.audit_events(actor_user_id, created_at desc);
create index audit_events_subject on public.audit_events(affected_user_id, created_at desc);
create index audit_events_entity on public.audit_events(entity_type, entity_id, created_at desc);

-- Keep updated_at consistent.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'boards','grades','academic_years','profiles','parent_contacts','curricula','subjects','chapters',
    'content_resources','ai_generation_jobs','question_banks','questions','assessments','packages',
    'payment_transactions','student_entitlements','refunds','study_plans','schedule_tasks',
    'assessment_attempts','daily_parent_reports','config_definitions'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name);
  end loop;
end $$;

-- Create a safe default student profile when an Auth user is created.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, status, full_name, onboarding_step)
  values (new.id, 'student', 'active', nullif(new.raw_user_meta_data ->> 'full_name', ''), 'verify_email')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

commit;
