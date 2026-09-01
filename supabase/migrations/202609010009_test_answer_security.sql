-- During a timed test, the attempt snapshot contains the correct option for
-- trusted grading and must not be directly readable until submission.
drop policy "Attempt questions are visible to authorized users" on public.attempt_questions;
create policy "Attempt questions are visible when permitted"
on public.attempt_questions for select to authenticated
using (exists (
  select 1 from public.assessment_attempts a
  where a.id = assessment_attempt_id
    and (a.student_id = (select auth.uid()) or (select private.is_super_admin()) or (select private.manages_student(a.student_id)))
    and (a.student_id <> (select auth.uid()) or a.mode = 'practice' or a.status = 'submitted')
));

