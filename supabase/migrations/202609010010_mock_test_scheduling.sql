create or replace function public.schedule_mock_test(p_assessment_id uuid, p_due_on date, p_start_now boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  plan_row public.study_plans%rowtype;
  test_row public.assessments%rowtype;
  task_row public.schedule_tasks%rowtype;
  attempt_row public.assessment_attempts%rowtype;
  next_attempt integer;
  has_overlap boolean;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into plan_row from public.study_plans where student_id = current_user_id and status in ('active','draft') order by (status = 'active') desc, created_at desc limit 1;
  if plan_row.id is null then raise exception 'Create a study plan before scheduling a test'; end if;
  select * into test_row from public.assessments where id = p_assessment_id and assessment_type = 'pdf_mock_test' and status = 'published';
  if test_row.id is null then raise exception 'Mock test not found'; end if;

  if p_start_now then
    select * into task_row from public.schedule_tasks where study_plan_id = plan_row.id and assessment_id = p_assessment_id and task_type = 'mock_test' and status = 'scheduled' order by due_on limit 1;
  end if;
  if task_row.id is null then
    select exists(select 1 from public.schedule_tasks where study_plan_id = plan_row.id and due_on = p_due_on and status <> 'cancelled') into has_overlap;
    insert into public.schedule_tasks(study_plan_id, task_type, due_on, original_due_on, assessment_id, overlap_confirmed)
    values(plan_row.id, 'mock_test', p_due_on, p_due_on, p_assessment_id, has_overlap) returning * into task_row;
  elsif p_start_now and task_row.due_on <> p_due_on then
    update public.schedule_tasks set due_on = p_due_on, overlap_confirmed = true where id = task_row.id returning * into task_row;
  end if;

  if p_start_now then
    if plan_row.status = 'draft' then
      update public.study_plans set status = 'active', activated_at = now() where id = plan_row.id;
    end if;
    select * into attempt_row from public.assessment_attempts where student_id = current_user_id and assessment_id = p_assessment_id and status = 'started' order by started_at desc limit 1;
    if attempt_row.id is null then
      select coalesce(max(attempt_number),0)+1 into next_attempt from public.assessment_attempts where student_id = current_user_id and assessment_id = p_assessment_id;
      insert into public.assessment_attempts(student_id, assessment_id, schedule_task_id, status, mode, attempt_number)
      values(current_user_id, p_assessment_id, task_row.id, 'started', 'manual', next_attempt) returning * into attempt_row;
    end if;
  end if;
  return jsonb_build_object('taskId',task_row.id,'attemptId',attempt_row.id,'started',p_start_now,'overlapConfirmed',task_row.overlap_confirmed);
end $$;

create or replace function public.finish_mock_test(p_attempt_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare attempt_row public.assessment_attempts%rowtype;
begin
  select * into attempt_row from public.assessment_attempts where id=p_attempt_id and student_id=auth.uid() and status='started' for update;
  if attempt_row.id is null then raise exception 'Active mock-test attempt not found'; end if;
  update public.assessment_attempts set status='submitted',submitted_at=now(),duration_seconds=extract(epoch from (now()-started_at))::integer where id=p_attempt_id;
  update public.schedule_tasks set status='completed',completed_at=now() where id=attempt_row.schedule_task_id and status='scheduled';
end $$;

revoke all on function public.schedule_mock_test(uuid,date,boolean) from public,anon;
revoke all on function public.finish_mock_test(uuid) from public,anon;
grant execute on function public.schedule_mock_test(uuid,date,boolean) to authenticated;
grant execute on function public.finish_mock_test(uuid) to authenticated;
