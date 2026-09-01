# Student Onboarding and Scheduling

## 1. Onboarding states

After email verification and entitlement resolution, the student must:

1. complete required profile fields;
2. optionally add parent name/email and send verification;
3. create an initial study plan through a simple wizard;
4. review overlap warnings and confirm the plan;
5. arrive at the personalized dashboard.

The wizard must be phone-friendly, save progress between steps, use plain student-oriented language, and allow returning to earlier steps.

## 2. Plan rules

- One active plan per student in v1.
- Plans belong to an academic year.
- Old plans are archived and retained.
- The schema supports multiple plans, but v1 business rules prevent a second active plan.
- Student plans remain editable after starting.
- Plan dates and daily cutoffs use `Asia/Kolkata`.

## 3. Manual schedule wizard

The wizard must let a student:

- name/confirm the academic plan;
- select a start/end range within the relevant academic year;
- add tasks on dates;
- choose a chapter-study, chapter-quiz, worksheet, or mock-test task;
- review the calendar/list;
- confirm and activate the plan.

Tasks use dates only; no start/end time is stored. Multiple tasks on the same date are valid.

## 4. Overlap behavior

Because tasks have no time, more than one task on a date is treated as workload overlap, not a scheduling conflict. The UI must show a warning and require explicit **Save anyway** confirmation. There is no hard task limit.

## 5. Task states

| State | Meaning |
| --- | --- |
| Scheduled | Future/today task not completed |
| Completed | Student completed the task |
| Missed | Task incomplete at the configured daily cutoff |
| Rescheduled | Task moved after being missed; current row has new due date |
| Cancelled | Incomplete future task removed by student |

Empty dates are rest days; no explicit rest task is required and no missed notification is generated.

## 6. Completion

- Students mark study and worksheet tasks complete.
- Completing a linked online quiz/test may complete its matching schedule task according to configured rules.
- A completed task is locked and cannot be moved, removed, or returned to incomplete.
- Online assessment submissions remain the authoritative completion evidence for linked tasks.
- All completion actions are server-timestamped and audited.

## 7. Missed and rescheduled tasks

- A SuperAdmin-configurable daily cutoff, initially 10:00 PM IST, marks eligible incomplete tasks missed.
- The process must be idempotent.
- Missed tasks are shown with a prompt to reschedule; no automatic rescheduling occurs.
- Rescheduling changes the task's due date, while original due date and date-change history are retained in audit/history fields.
- Reporting counts the task missed on its original date even if later completed.
- Future incomplete tasks may be cancelled/deleted logically; referenced history is retained.

## 8. Mock tests

- The student may manually schedule available platform mock tests.
- Existing four PDF/manual-score tests are migrated as additional platform tests.
- New automatically scored online tests may coexist with PDF/manual tests.
- Mock-test answer keys become available after submission; practice answer keys remain available.

## 9. Academic-year transition

- At package/academic-year rollover, the active plan is archived.
- Student purchases or receives a new entitlement and creates a new plan.
- Reports allow viewing prior plans and results.

