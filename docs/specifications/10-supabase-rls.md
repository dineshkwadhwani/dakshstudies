# Supabase Row Level Security Design

## 1. Security stance

RLS must be enabled on every exposed application table. The anonymous and authenticated PostgREST APIs receive no service-role credentials. Trusted Vercel functions use service credentials only for narrow operations such as payments, emails, AI jobs, and initialization.

## 2. Authorization helpers

Security-definer helper functions should be minimal, stable, `search_path`-hardened, and non-user-modifiable, for example:

- `current_profile_role()`
- `is_super_admin()`
- `is_active_user()`
- `manages_student(student_uuid)`
- `has_active_entitlement(student_uuid, feature_code)`
- `can_manage_config(config_uuid)`

Avoid trusting role or student IDs supplied by the client.

## 3. Profiles

- Student: select own profile; update only approved own fields.
- Account Manager: select own profile and assigned student profiles; no direct role/status mutation.
- SuperAdmin: select all; status/role mutations through audited functions.
- Sensitive administrative fields are updated only through RPC/server workflows.

## 4. Student-owned records

For plans, tasks, attempts, responses, manual scores, parent contacts, and entitlements:

- Student selects own rows, subject to account status and expired-mode rules.
- Student inserts/updates only through allowed transitions; immutable submitted/completed fields cannot be rewritten.
- Account Manager selects rows for currently assigned students where the permission matrix allows.
- SuperAdmin selects all.
- Cross-student foreign keys are validated inside trusted functions.

Complex transitions—assessment submission, task completion, rescheduling, entitlement change—should use RPC/server transactions rather than broad direct update policies.

## 5. Public/catalogue content

- Anonymous users may select only intentionally public landing/package summaries.
- Authenticated entitled students select published curriculum/content metadata allowed by package features.
- Draft/review/archived content is SuperAdmin-only, except historical snapshot data already owned by a student.
- Account Managers do not obtain content-edit policies.
- Correct answer data is not available through general student selects before permitted review.

## 6. Storage policies

- Source and published learning files live in private buckets.
- Students do not enumerate buckets directly.
- A trusted endpoint checks active account, entitlement, content publication, and answer-key release policy before returning a short-lived signed URL.
- SuperAdmin upload paths are scoped and validated.
- AI processor service access is limited to job-specific source/output paths.

## 7. Packages and payments

- Public users select only enabled package display fields; never internal configuration.
- Students select their own entitlements and sanitized transaction summaries.
- Students cannot insert/update successful payments or entitlements.
- Account Managers read assigned-student payment summaries and invoke authorized refund/assignment functions.
- Razorpay webhook/payment writes are service-only.
- SuperAdmin manages package definitions through audited functions.

## 8. Configuration

- Students may read only client-safe effective settings.
- Account Managers update only delegated keys through an audited RPC that verifies type and permission.
- SuperAdmin manages all settings.
- Secrets never reside in readable configuration tables; they remain server environment secrets.

## 9. Audit and notifications

- Audit events: no student or Account Manager select policy; SuperAdmin select only.
- No application role may update/delete audit events.
- Inserts occur through trusted functions/triggers/service jobs.
- Parent report rows are student-readable as history without provider internals; Account Managers have no delivery-report UI; SuperAdmin/operations may access sanitized operational state as needed.

## 10. Deactivated and expired behavior

- Deactivated users are denied application data access even if Supabase session remains valid.
- Expired students may select own profile, package catalogue, entitlements/payments, and historical report data.
- Expired students cannot create plans/tasks, start assessments, request protected learning files, or mutate learning records.
- Entitlement checks use server time.

## 11. Verification tests

Automated RLS tests must cover at least:

- student A cannot access student B data;
- unassigned Account Manager cannot access a student;
- reassignment revokes old Manager access;
- expired/deactivated states enforce restrictions;
- draft content and correct answers are protected;
- browser clients cannot forge payments or entitlements;
- non-SuperAdmin cannot read audit events;
- delegated configuration cannot escape its scope;
- signed file access respects entitlement and answer-key timing.

