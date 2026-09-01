create or replace function public.start_chapter_quiz(p_chapter_id uuid, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  assessment_row public.assessments%rowtype;
  attempt_row public.assessment_attempts%rowtype;
  question record;
  option_rows jsonb;
  correct_option text;
  next_attempt integer;
  matching_task uuid;
  questions_json jsonb;
begin
  if current_user_id is null or p_mode not in ('practice', 'test') then raise exception 'Invalid quiz request'; end if;
  if not private.is_active_user() or not private.has_active_entitlement(current_user_id) then raise exception 'An active package is required'; end if;

  select * into assessment_row from public.assessments
  where chapter_id = p_chapter_id and assessment_type = 'practice_quiz' and status = 'published'
  order by created_at limit 1;
  if assessment_row.id is null then raise exception 'Published chapter quiz not found'; end if;

  select st.id into matching_task
  from public.schedule_tasks st join public.study_plans sp on sp.id = st.study_plan_id
  where sp.student_id = current_user_id and sp.status = 'active'
    and st.chapter_id = p_chapter_id and st.task_type = 'chapter_quiz' and st.status = 'scheduled'
  order by st.due_on, st.created_at limit 1;

  select coalesce(max(attempt_number), 0) + 1 into next_attempt
  from public.assessment_attempts where student_id = current_user_id and assessment_id = assessment_row.id;

  insert into public.assessment_attempts(student_id, assessment_id, schedule_task_id, status, mode, attempt_number)
  values(current_user_id, assessment_row.id, matching_task, 'started', p_mode, next_attempt)
  returning * into attempt_row;

  for question in
    select qv.id, qv.prompt, aq.marks
    from public.assessment_questions aq
    join public.assessment_sections section on section.id = aq.assessment_section_id
    join public.question_versions qv on qv.id = aq.question_version_id
    where section.assessment_id = assessment_row.id and qv.status = 'published'
    order by random() limit 25
  loop
    select jsonb_agg(jsonb_build_object('id', qo.id::text, 'text', qo.option_text) order by qo.canonical_order),
           max(qo.id::text) filter (where qo.is_correct)
    into option_rows, correct_option
    from public.question_options qo where qo.question_version_id = question.id;

    insert into public.attempt_questions(assessment_attempt_id, question_version_id, position, prompt_snapshot, options_snapshot, correct_option_snapshot, marks)
    values(attempt_row.id, question.id,
      (select coalesce(max(position), 0) + 1 from public.attempt_questions where assessment_attempt_id = attempt_row.id),
      question.prompt, option_rows, correct_option, question.marks);
  end loop;

  select jsonb_agg(jsonb_build_object(
    'attemptQuestionId', aq.id, 'q', aq.prompt_snapshot, 'opts', aq.options_snapshot,
    'correctOptionId', case when p_mode = 'practice' then aq.correct_option_snapshot else null end
  ) order by aq.position) into questions_json
  from public.attempt_questions aq where aq.assessment_attempt_id = attempt_row.id;

  return jsonb_build_object('attemptId', attempt_row.id, 'title', assessment_row.title,
    'durationMinutes', assessment_row.duration_minutes, 'mode', p_mode, 'questions', questions_json);
end;
$$;

create or replace function public.submit_chapter_quiz(p_attempt_id uuid, p_selected_option_ids jsonb, p_duration_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  attempt_row public.assessment_attempts%rowtype;
  question record;
  selected_id text;
  correct boolean;
  earned numeric := 0;
  total numeric := 0;
  correct_options jsonb := '[]'::jsonb;
begin
  select * into attempt_row from public.assessment_attempts
  where id = p_attempt_id and student_id = current_user_id and status = 'started' for update;
  if attempt_row.id is null then raise exception 'Active quiz attempt not found'; end if;

  for question in select * from public.attempt_questions where assessment_attempt_id = p_attempt_id order by position
  loop
    selected_id := p_selected_option_ids ->> (question.position - 1);
    correct := selected_id is not null and selected_id = question.correct_option_snapshot;
    total := total + question.marks;
    if correct then earned := earned + question.marks; end if;
    insert into public.attempt_responses(attempt_question_id, selected_option, is_correct, marks_awarded, answered_at)
    values(question.id, selected_id, correct, case when correct then question.marks else 0 end, case when selected_id is null then null else now() end)
    on conflict (attempt_question_id) do update set selected_option = excluded.selected_option,
      is_correct = excluded.is_correct, marks_awarded = excluded.marks_awarded, answered_at = excluded.answered_at;
    correct_options := correct_options || jsonb_build_array(question.correct_option_snapshot);
  end loop;

  update public.assessment_attempts set status = 'submitted', submitted_at = now(),
    duration_seconds = greatest(coalesce(p_duration_seconds, 0), 0), score = earned,
    maximum_score = total, percentage = case when total > 0 then round(earned * 100 / total, 2) else 0 end
  where id = p_attempt_id;

  if attempt_row.schedule_task_id is not null then
    update public.schedule_tasks set status = 'completed', completed_at = now()
    where id = attempt_row.schedule_task_id and status = 'scheduled';
  end if;

  insert into public.audit_events(event_type, actor_user_id, actor_role, affected_user_id, entity_type, entity_id, metadata)
  values('quiz.submitted', current_user_id, 'student', current_user_id, 'assessment_attempt', p_attempt_id,
    jsonb_build_object('mode', attempt_row.mode, 'score', earned, 'maximum_score', total));

  return jsonb_build_object('score', earned, 'total', total,
    'percent', case when total > 0 then round(earned * 100 / total, 2) else 0 end,
    'correctOptionIds', correct_options, 'scheduleTaskCompleted', attempt_row.schedule_task_id is not null);
end;
$$;

revoke all on function public.start_chapter_quiz(uuid, text) from public, anon;
revoke all on function public.submit_chapter_quiz(uuid, jsonb, integer) from public, anon;
grant execute on function public.start_chapter_quiz(uuid, text) to authenticated;
grant execute on function public.submit_chapter_quiz(uuid, jsonb, integer) to authenticated;

