# Audit and Reporting

## 1. Audit objective

The platform must preserve an append-only account of security events, meaningful learning activity, commercial operations, configuration changes, and administrative actions. Audit reports are visible only to SuperAdmin in v1.

## 2. Events to audit

### Identity and access

- registration, email verification, login success/failure, logout, password recovery;
- profile and parent-contact changes;
- activation/deactivation/reactivation;
- role, assignment, and delegated-permission changes.

### Packages and payments

- package selection;
- Razorpay order creation, verified success/failure, webhook processing;
- entitlement creation, upgrade, assignment, extension, expiry, and revocation;
- refund request/result.

### Scheduling and learning

- plan creation, activation, archive, and edits;
- task creation, overlap confirmation, completion, missed marking, rescheduling, and cancellation;
- quiz/test start, submission, abandonment, and scoring;
- manual-score entry where applicable.

PDF views/downloads are explicitly not included in the product audit catalogue (`K2-C`). Operational access logs may still exist at infrastructure level.

### Content and administration

- package/configuration changes;
- subject/chapter/resource/question/test creation and versions;
- file upload, AI job request/result, review, publish, and archive;
- report exports and audit-report access.

## 3. Audit record

Each event should include:

- stable event ID and event type;
- server timestamp;
- actor user ID/role or system actor;
- affected user ID when applicable;
- entity type and entity ID;
- action outcome;
- sanitized before/after or change summary for important mutations;
- request/correlation ID;
- IP address and user agent where justified;
- structured, non-sensitive metadata.

Never store passwords, auth tokens, API secrets, full payment credentials, verification tokens, or full email bodies.

## 4. Audit integrity and retention

- Application users cannot update/delete audit rows.
- Audit insertion occurs through trusted database functions/triggers or server endpoints.
- Retention is one year.
- Expiry is performed only by an authorized automated retention process and logged.
- Deactivating an account does not remove its audit trail.
- Audit timestamps use UTC; reports render in IST.

## 5. Student reports

Required v1 reports:

- schedule adherence;
- subject performance;
- chapter performance;
- quiz history;
- mock/online test history;
- missed and rescheduled work;
- study streak;
- parent-notification history.

Students see learning history, not internal audit events.

## 6. Reporting definitions

- Default quiz score is the latest submitted score (`I2-B`).
- Reports may additionally show best and average when clearly labeled.
- A missed task remains missed for original-date adherence even when later completed.
- Rest/empty days do not break adherence or create misses.
- Completed means completed by the relevant cutoff unless a report explicitly says eventual completion.
- Online scores come from immutable submissions.
- PDF/manual test scores reflect submitted student score records and are locked after submission in v1.
- Partial test aggregates must state which sections/papers are included.

## 7. Administrative reports

SuperAdmin and authorized operational screens require:

- registered, active, and deactivated users;
- trial, paid, expiring, and expired entitlements;
- sales, revenue, upgrades, refunds, and payment failures;
- engagement and schedule adherence;
- subject/chapter and assessment performance;
- parent-notification operational summaries;
- audit events (SuperAdmin only).

Account Managers see non-audit reports only for assigned students. SuperAdmin reports include expired/deactivated students by default. CSV is the v1 export format; export actions are audited.

## 8. Performance/privacy

- Aggregate reports should use database views/materialized summaries where necessary.
- Reports must enforce the same assignment/RLS boundaries as source records.
- Exports must be generated server-side with short-lived access and no public URLs.
- Report queries must not expose correct answers where the student is not authorized to see them.

