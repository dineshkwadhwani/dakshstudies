# Migration and Implementation Plan

## 1. Migration objective

Move the canonical root application from static content and browser-local progress to authenticated, database-driven multi-user operation without migrating Daksh's personal local schedule, quiz attempts, or scores.

## 2. Repository preparation

1. Declare the repository root canonical.
2. Archive/remove the divergent `portal/` copy after verifying unique functionality/content.
3. Preserve this specification set and current-functionality inventory.
4. Add schema migration, seed, server-function, and automated-test structure.
5. Add a secret-free `.env.example`; validate environment variables at startup.

No destructive removal should occur until the `portal/` differences and assets are reconciled.

## 3. Phased implementation

### Phase 1 — Foundation

- Supabase projects/configuration, migration tooling, base schema, enums, timestamps.
- Seeded SuperAdmin and role/profile model.
- Authentication, verification, profile onboarding, deactivation enforcement.
- RLS helper functions and isolation test harness.
- Public landing/package pages and role-aware application shells.

Exit: verified student and seeded SuperAdmin can authenticate; cross-user access tests pass.

### Phase 2 — Curriculum migration

- Boards, grade, curriculum, subjects, chapters, resources, questions, and assessments schema.
- Private Storage and signed access.
- Idempotent import scripts for JSON and PDFs.
- SuperAdmin content screens and publish/archive/version workflow.
- Migrate all 50 chapters, 2,500 MCQs, resources, and four PDF mock tests.

Exit: counts/checksums match source; student screens render published database content.

### Phase 3 — Packages and payments

- Package/configuration admin.
- Trial eligibility and entitlement enforcement.
- Razorpay orders, checkout, webhook verification, upgrades, refunds, and transaction views.
- Expired-mode UI and package repurchase.

Exit: test-mode payment paths are idempotent and no browser action can forge access.

### Phase 4 — Scheduling

- Academic-year plans, wizard, tasks, overlap confirmation, task states.
- One-active-plan enforcement.
- Completion, missed cutoff, rescheduling history, archives, dashboard.
- Link quizzes/tests/worksheets to tasks.

Exit: independent students can create and track isolated schedules; missed/rescheduled reporting is correct.

### Phase 5 — Assessments and reports

- Online practice and automatically scored test attempts.
- Exact question/option snapshots and abandonment.
- PDF/manual mock-test submission and locked scores.
- Student and administrative reports plus CSV exports.
- Latest-score default with clearly labeled best/average additions.

Exit: historical attempts remain correct after content version changes.

### Phase 6 — Parent email and audit

- Parent verification/consent/unsubscribe.
- Daily missed/completed report generation through Resend.
- Full audit event catalogue, one-year retention, SuperAdmin audit UI.
- Operational cron/retry monitoring.

Exit: one idempotent daily report per eligible student/date and required events are auditable.

### Phase 7 — AI content workflow

- PDF processing, asynchronous generation jobs, schema validation.
- Draft/review/edit/publish administration.
- Provenance/version history and failure recovery.

Exit: generated content cannot become public without explicit SuperAdmin publication.

## 4. Content import method

- Assign stable new UUIDs while storing legacy subject/chapter/test IDs.
- Import parents before children in transactions/batches.
- Upload files using deterministic paths and checksums.
- Map every JSON resource path to a storage object/version record.
- Validate question/answer counts and option correctness.
- Produce a reconciliation report: expected/imported/skipped/failed counts.
- Make scripts idempotent so interrupted imports can be rerun safely.

## 5. Data not migrated

- `localStorage` quiz attempts/scores;
- schedule check-offs;
- manually entered test scores;
- shared session lock/auth state;
- any inferred Daksh profile unless created explicitly as a new account.

## 6. Testing gates

- Unit tests for entitlement dates, upgrades, cutoffs, score calculations, and report definitions.
- Integration tests for registration, verification, payment/webhook, refunds, parent email, cron, and AI jobs.
- RLS adversarial tests for every private table.
- Migration count/checksum/link validation.
- End-to-end mobile flows for all roles.
- Accessibility and production-build checks.
- Payment and email sandbox/test-mode verification before live credentials.

## 7. Cutover

1. Freeze static content changes or rerun final delta import.
2. Apply reviewed production migrations and seed SuperAdmin.
3. Import/reconcile content and private files.
4. Enable Supabase Auth settings, Razorpay webhook, Resend domain, and Vercel cron.
5. Run smoke/RLS/payment/email checks.
6. Deploy new application behind controlled registration/configuration.
7. Monitor errors, webhooks, scheduled jobs, and support requests.
8. Retain rollback capability for frontend deployment; database changes use forward repair migrations.

## 8. v2-ready decisions without v1 implementation

The schema should accommodate, but v1 UI must not expose:

- multiple active/parallel plans;
- package-specific subject/chapter availability;
- Pro on-demand tests and worksheets;
- additional boards, grades, and academic years;
- additional operational roles or institutional tenancy.

## 9. Approval gates

Implementation should begin only after approval of:

- specifications and terminology;
- database ERD and migration SQL;
- RLS policy matrix/tests;
- Razorpay entitlement/refund behavior;
- parent consent/email wording;
- audit catalogue and retention;
- AI provider and review controls.

