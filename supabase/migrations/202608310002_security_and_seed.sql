begin;

create or replace function private.current_profile_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active'
$$;

create or replace function private.is_super_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select private.current_profile_role()) = 'super_admin', false)
$$;

create or replace function private.is_active_user()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  )
$$;

create or replace function private.manages_student(student_uuid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_manager_assignments a
    join public.profiles manager on manager.id = a.account_manager_id
    where a.student_id = student_uuid
      and a.account_manager_id = (select auth.uid())
      and a.ends_at is null
      and manager.role = 'account_manager'
      and manager.status = 'active'
  )
$$;

create or replace function private.has_active_entitlement(student_uuid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_entitlements e
    where e.student_id = student_uuid
      and e.status = 'active'
      and now() >= e.starts_at
      and now() < e.ends_at
  )
$$;

create or replace function private.can_manage_config(config_uuid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select private.is_super_admin()) or exists (
    select 1 from public.config_delegations d
    where d.account_manager_id = (select auth.uid())
      and d.config_definition_id = config_uuid
      and d.active
  )
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.manages_student(uuid) to authenticated;
grant execute on function private.has_active_entitlement(uuid) to authenticated;
grant execute on function private.can_manage_config(uuid) to authenticated;

-- Enable RLS everywhere exposed through public schema.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'boards','grades','academic_years','profiles','student_manager_assignments','parent_contacts',
    'account_status_history','curricula','subjects','chapters','content_resources','content_resource_versions',
    'ai_generation_jobs','question_banks','questions','question_versions','question_options','assessments',
    'assessment_sections','assessment_questions','assessment_resources','packages','features','package_features',
    'payment_transactions','student_entitlements','payment_webhook_events','refunds','study_plans','schedule_tasks',
    'schedule_task_date_history','assessment_attempts','attempt_questions','attempt_responses','manual_test_scores',
    'daily_parent_reports','config_definitions','config_values','config_delegations','email_templates','audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

-- Public catalog grants.
grant select on public.packages, public.academic_years to anon, authenticated;
grant select on public.boards, public.grades, public.curricula, public.subjects, public.chapters,
  public.content_resources, public.content_resource_versions, public.assessments,
  public.assessment_sections, public.assessment_resources, public.question_banks,
  public.questions, public.question_versions, public.features, public.package_features to authenticated;

create policy "Public can view current academic years"
on public.academic_years for select to anon, authenticated
using (true);

create policy "Public can view sale packages"
on public.packages for select to anon, authenticated
using (sale_enabled and status = 'published');

create policy "Active entitled users can view boards"
on public.boards for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view grades"
on public.grades for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view curricula"
on public.curricula for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view subjects"
on public.subjects for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view chapters"
on public.chapters for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view resources"
on public.content_resources for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view resource versions"
on public.content_resource_versions for select to authenticated
using ((select private.is_super_admin()) or (
  (select private.is_active_user()) and (select private.has_active_entitlement((select auth.uid()))) and
  exists (select 1 from public.content_resources r where r.id = resource_id and r.status = 'published')
));
create policy "Active entitled users can view assessments"
on public.assessments for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view assessment sections"
on public.assessment_sections for select to authenticated
using ((select private.is_super_admin()) or (
  (select private.is_active_user()) and (select private.has_active_entitlement((select auth.uid()))) and
  exists (select 1 from public.assessments a where a.id = assessment_id and a.status = 'published')
));
create policy "Active entitled users can view assessment resources"
on public.assessment_resources for select to authenticated
using ((select private.is_super_admin()) or (
  (select private.is_active_user()) and (select private.has_active_entitlement((select auth.uid()))) and
  exists (select 1 from public.assessments a where a.id = assessment_id and a.status = 'published')
));
create policy "Active entitled users can view question banks"
on public.question_banks for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view question identities"
on public.questions for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Active entitled users can view question prompts"
on public.question_versions for select to authenticated
using ((select private.is_super_admin()) or ((select private.is_active_user()) and status = 'published' and (select private.has_active_entitlement((select auth.uid())))));
create policy "Authenticated can view features"
on public.features for select to authenticated using (true);
create policy "Authenticated can view package features"
on public.package_features for select to authenticated using (true);

-- Profiles and operational assignment reads.
grant select on public.profiles, public.student_manager_assignments, public.parent_contacts,
  public.account_status_history to authenticated;
grant update (full_name, phone, school_name, city, date_of_birth, grade_id, board_id, target_exam_date, onboarding_step, updated_at)
  on public.profiles to authenticated;

create policy "Users can view permitted profiles"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(id)));

create policy "Users can update own profile fields"
on public.profiles for update to authenticated
using (id = (select auth.uid()) and status = 'active')
with check (id = (select auth.uid()) and status = 'active');

create policy "Managers can view own assignments"
on public.student_manager_assignments for select to authenticated
using ((select private.is_super_admin()) or student_id = (select auth.uid()) or account_manager_id = (select auth.uid()));

create policy "Parent contacts are visible to authorized users"
on public.parent_contacts for select to authenticated
using (student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(student_id)));

create policy "Account history is visible to authorized users"
on public.account_status_history for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(user_id)));

-- Student-owned history. Mutations go through trusted RPC/server workflows.
grant select on public.student_entitlements, public.payment_transactions, public.refunds,
  public.study_plans, public.schedule_tasks, public.schedule_task_date_history,
  public.assessment_attempts, public.attempt_questions, public.attempt_responses,
  public.manual_test_scores, public.daily_parent_reports to authenticated;

create policy "Entitlements are visible to authorized users"
on public.student_entitlements for select to authenticated
using (student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(student_id)));
create policy "Payments are visible to authorized users"
on public.payment_transactions for select to authenticated
using (student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(student_id)));
create policy "Refunds are visible to authorized users"
on public.refunds for select to authenticated
using ((select private.is_super_admin()) or exists (
  select 1 from public.payment_transactions p
  where p.id = payment_transaction_id and (p.student_id = (select auth.uid()) or (select private.manages_student(p.student_id)))
));
create policy "Plans are visible to authorized users"
on public.study_plans for select to authenticated
using (student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(student_id)));
create policy "Tasks are visible to authorized users"
on public.schedule_tasks for select to authenticated
using (exists (
  select 1 from public.study_plans p where p.id = study_plan_id
    and (p.student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(p.student_id)))
));
create policy "Task date history is visible to authorized users"
on public.schedule_task_date_history for select to authenticated
using (exists (
  select 1 from public.schedule_tasks t join public.study_plans p on p.id = t.study_plan_id
  where t.id = schedule_task_id
    and (p.student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(p.student_id)))
));
create policy "Attempts are visible to authorized users"
on public.assessment_attempts for select to authenticated
using (student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(student_id)));
create policy "Attempt questions are visible to authorized users"
on public.attempt_questions for select to authenticated
using (exists (
  select 1 from public.assessment_attempts a where a.id = assessment_attempt_id
    and (a.student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(a.student_id)))
));
create policy "Attempt responses are visible to authorized users"
on public.attempt_responses for select to authenticated
using (exists (
  select 1 from public.attempt_questions q join public.assessment_attempts a on a.id = q.assessment_attempt_id
  where q.id = attempt_question_id
    and (a.student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(a.student_id)))
));
create policy "Manual scores are visible to authorized users"
on public.manual_test_scores for select to authenticated
using (exists (
  select 1 from public.assessment_attempts a where a.id = assessment_attempt_id
    and (a.student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(a.student_id)))
));
create policy "Parent report history is visible to student and super admin"
on public.daily_parent_reports for select to authenticated
using (student_id = (select auth.uid()) or (select private.is_super_admin()));

-- Configuration and admin-only records.
grant select on public.config_definitions, public.config_values, public.config_delegations to authenticated;
grant select on public.audit_events, public.ai_generation_jobs, public.email_templates to authenticated;

create policy "Client-safe or manageable config definitions"
on public.config_definitions for select to authenticated
using (client_visible or (select private.is_super_admin()) or (select private.can_manage_config(id)));
create policy "Client-safe or manageable config values"
on public.config_values for select to authenticated
using (exists (
  select 1 from public.config_definitions d where d.id = config_definition_id
    and (d.client_visible or (select private.is_super_admin()) or (select private.can_manage_config(d.id)))
));
create policy "Managers see own config delegations"
on public.config_delegations for select to authenticated
using ((select private.is_super_admin()) or account_manager_id = (select auth.uid()));
create policy "Only super admin views audit events"
on public.audit_events for select to authenticated using ((select private.is_super_admin()));
create policy "Only super admin views AI jobs"
on public.ai_generation_jobs for select to authenticated using ((select private.is_super_admin()));
create policy "Only super admin views email templates"
on public.email_templates for select to authenticated using ((select private.is_super_admin()));

-- No browser access to answer correctness, payment webhooks, or assessment composition.
revoke all on public.question_options, public.assessment_questions, public.payment_webhook_events from anon, authenticated;

-- Private storage buckets; files are served through trusted signed-URL endpoints.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('learning-content', 'learning-content', false, 52428800),
  ('source-content', 'source-content', false, 52428800),
  ('report-exports', 'report-exports', false, 10485760)
on conflict (id) do nothing;

-- Seed initial catalogues and the 2026-27 package/config baseline.
insert into public.boards (code, name) values ('CBSE', 'Central Board of Secondary Education') on conflict (code) do nothing;
insert into public.grades (code, name, sort_order) values ('10', 'Class 10', 10) on conflict (code) do nothing;
insert into public.academic_years (code, name, starts_on, ends_on, is_current)
values ('2026-27', 'Academic Year 2026–27', '2026-04-01', '2027-04-30', true)
on conflict (code) do update set is_current = excluded.is_current;

with ay as (select id from public.academic_years where code = '2026-27')
insert into public.packages (academic_year_id, code, name, rank, price_paise, package_type, trial_days, fixed_expires_on)
select ay.id, p.code, p.name, p.rank, p.price_paise, p.package_type, p.trial_days, p.fixed_expires_on
from ay cross join (values
  ('FREE', 'Free Trial', 0::smallint, 0, 'trial', 7, null::date),
  ('BASIC', 'Basic', 1::smallint, 29900, 'paid', null::integer, '2027-04-30'::date),
  ('PRO', 'Pro', 2::smallint, 99900, 'paid', null::integer, '2027-04-30'::date)
) as p(code, name, rank, price_paise, package_type, trial_days, fixed_expires_on)
on conflict (academic_year_id, code) do nothing;

insert into public.features(code, name, description) values
  ('learning_content', 'Learning content', 'Subjects, chapters, summaries and notes'),
  ('practice_mcq', 'Practice MCQs', 'Chapter practice quizzes'),
  ('worksheets', 'Worksheets', 'Published worksheets and answer keys'),
  ('mock_tests', 'Mock tests', 'Published online and PDF tests'),
  ('study_plan', 'Study plan', 'One active manual plan'),
  ('reports', 'Reports', 'Student progress reports')
on conflict (code) do nothing;

insert into public.package_features(package_id, feature_id, enabled)
select p.id, f.id, true from public.packages p cross join public.features f
on conflict (package_id, feature_id) do nothing;

insert into public.config_definitions(key, name, description, category, value_type, default_value, client_visible, delegatable) values
  ('trial_duration_days', 'Trial duration', 'Number of days granted to a new eligible trial', 'packages', 'integer', '7'::jsonb, true, false),
  ('daily_schedule_cutoff_ist', 'Daily schedule cutoff', 'IST time used to mark missed tasks and send parent reports', 'scheduling', 'string', '"22:00"'::jsonb, true, true),
  ('student_registration_enabled', 'Student registration', 'Allow new student registrations', 'platform', 'boolean', 'true'::jsonb, true, true),
  ('maintenance_mode', 'Maintenance mode', 'Restrict non-admin application access', 'platform', 'boolean', 'false'::jsonb, true, true)
on conflict (key) do nothing;

insert into public.config_values(config_definition_id, value)
select id, default_value from public.config_definitions
on conflict (config_definition_id) do nothing;

commit;
