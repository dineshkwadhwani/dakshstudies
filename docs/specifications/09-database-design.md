# Database Design

## 1. Conventions

- PostgreSQL in Supabase is the system of record.
- Primary keys use UUIDs unless a small controlled lookup benefits from text keys.
- All timestamps are `timestamptz` in UTC; academic due dates use `date` interpreted in `Asia/Kolkata`.
- Mutable tables include `created_at`, `updated_at`, and relevant actor IDs.
- Published content uses versioning and archive status instead of destructive updates.
- Money is stored in integer paise with ISO currency (`INR`).
- Business rules are enforced by constraints, transactions, database functions, and RLS—not just UI code.

## 2. Identity and operations

### `profiles`

`id` (FK `auth.users`), `role`, `status`, `full_name`, `phone`, `school_name`, `city`, `date_of_birth`, `grade_id`, `board_id`, `target_exam_date`, `onboarding_state`, timestamps.

Role: `super_admin`, `account_manager`, `student`. Status: `active`, `deactivated`.

### `student_manager_assignments`

`id`, `student_id`, `account_manager_id`, `starts_at`, `ends_at`, `assigned_by`.

Partial uniqueness ensures at most one current Account Manager per student.

### `parent_contacts`

`id`, `student_id`, `parent_name`, `email`, `verification_status`, `verification_token_hash`, `token_expires_at`, `verified_at`, `consented_at`, `unsubscribed_at`, timestamps.

At most one active contact per student in v1.

### `account_status_history`

`id`, `user_id`, `from_status`, `to_status`, `reason`, `changed_by`, `created_at`.

## 3. Academic structure

### `boards`, `grades`, `academic_years`

Controlled catalogues. `academic_years` contains name, start/end dates, and status.

### `curricula`

Links board, grade, and optionally academic year/version.

### `subjects`

`id`, `curriculum_id`, optional `parent_subject_id`, `name`, `slug`, description, color/icon metadata, display order, status, legacy ID, timestamps.

### `chapters`

`id`, `subject_id`, number, title, slug, description, display order, status, legacy ID, current version, timestamps.

## 4. Content and storage

### `content_resources`

`id`, `chapter_id`, `resource_type`, title, description, status, current version, display order, access metadata, timestamps.

### `content_resource_versions`

`id`, `resource_id`, version number, storage object path, MIME type, size, checksum, source/provenance, created_by, reviewed_by, published_at, timestamps.

### `ai_generation_jobs`

`id`, source resource version, requested output types, provider/model, prompt/version metadata, status, result references, error summary, requested_by, reviewed_by, timestamps.

Secrets and full sensitive provider payloads are excluded.

## 5. Questions and tests

### `question_banks`

`id`, chapter/subject scope, name, type, status, version metadata.

### `questions` and `question_versions`

Stable question identity plus versioned prompt, explanation, difficulty, topic, status, provenance, and correct option reference.

### `question_options`

`id`, `question_version_id`, option text, canonical order, correctness flag.

Correctness must not be selectable through student-facing database policies before authorization permits review.

### `assessments`

`id`, academic scope, title, assessment type (`practice_quiz`, `online_test`, `pdf_mock_test`), maximum marks, duration, answer-key policy, status, legacy ID, timestamps.

### `assessment_sections`, `assessment_questions`, `assessment_resources`

Represent subject papers, ordered versioned questions, and PDF question/answer resources.

### `assessment_attempts`

`id`, `student_id`, `assessment_id`, linked schedule task, status (`started`, `submitted`, `abandoned`), mode, started/submitted timestamps, duration, score/max/percentage, attempt sequence.

### `attempt_questions` and `attempt_responses`

Snapshot question/version, presented prompt/options/order, correct option snapshot, selected option, correctness, marks, and response timestamp. Correct-answer fields are exposed only after authorized review.

### `manual_test_scores`

For existing PDF mock tests: student, attempt/assessment section, marks, max marks, submitted timestamp. Submitted records are immutable in v1.

## 6. Packages and payments

### `packages`

`id`, academic year, name, code, rank, price in paise, currency, package type (`trial`, `paid`), trial days, fixed expiry date, sale enabled, status, timestamps.

### `features` and `package_features`

Feature catalogue and enabled/configured package entitlements. v1 packages initially share learning features.

### `student_entitlements`

`id`, student, package, academic year, source, starts/ends timestamps, status, source payment, assigned/extended by, reason, timestamps.

Retain history; constrain business logic to one effective entitlement per student/academic year at a time.

### `payment_transactions`

Internal payment, student, package, academic year, transaction type, amount/currency, status, Razorpay order/payment IDs, parent transaction for upgrade/refund, idempotency key, timestamps. Provider identifiers are uniquely constrained.

### `payment_webhook_events`

Provider event ID/type, signature verification result, processing state, sanitized payload/reference, received/processed timestamps. Unique provider event ID ensures idempotency.

### `refunds`

Original transaction, amount, reason, status, Razorpay refund ID, initiated by, timestamps.

## 7. Plans and schedules

### `study_plans`

`id`, student, academic year, name, start/end dates, status (`draft`, `active`, `archived`), activated/archived timestamps, timestamps.

Partial unique index: one active plan per student.

### `schedule_tasks`

`id`, plan, task type, due date, original due date, chapter/resource/assessment reference as applicable, status, overlap confirmed, completed timestamp, missed timestamp, cancelled timestamp, timestamps.

Check constraints require the relevant content reference for each task type.

### `schedule_task_date_history`

Task, old date, new date, reason, changed by, timestamp. This supports rescheduling reports even though the same task row is moved.

## 8. Notifications and configuration

### `daily_parent_reports`

Student, parent contact, report date, task-status snapshot, status, provider message ID, attempts, error category, queued/sent timestamps. Unique `(student_id, report_date)`.

### `config_definitions`, `config_values`

Typed configuration catalogue and current global values. Values store schema/type, category, visibility, and immediate effective state.

### `config_delegations`

Account Manager, configuration definition/category, granted by, active dates.

Package availability remains in `packages`; feature entitlements remain in `package_features` rather than being collapsed into generic config.

## 9. Audit

### `audit_events`

Append-only event ID/type, actor, affected user, entity type/ID, outcome, sanitized changes/metadata JSON, request ID, IP/user agent where appropriate, server timestamp, retention expiry timestamp.

No application update/delete policy. Automated retention uses a privileged database function.

## 10. Essential indexes and constraints

- Unique subject/chapter slugs within their parent scope.
- Unique legacy IDs where present.
- One active manager assignment per student.
- One active plan per student.
- One daily parent report per student/date.
- Unique Razorpay order, payment, refund, and webhook event IDs.
- Attempt indexes on student/date, assessment/student, and chapter/student.
- Schedule indexes on plan/due date/status.
- Audit indexes on timestamp, actor, affected user, event type, and entity.
- Foreign keys use restrictive deletion by default; archive/deactivate replaces cascading deletion.

