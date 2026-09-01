grant insert, update on public.study_plans, public.schedule_tasks to authenticated;

create policy "Students create own study plans" on public.study_plans
for insert to authenticated
with check (student_id = (select auth.uid()) and status = 'draft');

create policy "Students update own study plans" on public.study_plans
for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy "Students create tasks in own plan" on public.schedule_tasks
for insert to authenticated
with check (exists (
  select 1 from public.study_plans p
  where p.id = study_plan_id and p.student_id = (select auth.uid())
));

create policy "Students update tasks in own plan" on public.schedule_tasks
for update to authenticated
using (exists (
  select 1 from public.study_plans p
  where p.id = study_plan_id and p.student_id = (select auth.uid())
))
with check (exists (
  select 1 from public.study_plans p
  where p.id = study_plan_id and p.student_id = (select auth.uid())
));

