# Product Requirements and Scope

## 1. Product vision

The platform helps CBSE Class 10 students plan exam preparation, study curriculum content, practise MCQs, complete worksheets and tests, and understand their progress. Unlike the current personalized portal, every student has an authenticated account, an academic-year entitlement, an individual schedule, and isolated progress data.

## 2. Personas

### Student

A self-registering learner who purchases or receives a package, creates a schedule, consumes learning content, completes assessments, and views personal reports.

### Account Manager

A platform operations user created by SuperAdmin. Account Managers manage assigned students, activation status, permitted configuration, packages, refunds, and reports within their granted scope. They do not manage curriculum content.

### SuperAdmin

The platform owner seeded during initial database setup. SuperAdmin controls staff, students, packages, content, configuration, audit visibility, and all administrative operations.

## 3. Public experience

The public site must include:

- a landing page explaining the CBSE Class 10 value proposition;
- feature sections for chapter summaries, notes, MCQs, tests, worksheets, schedules, and reporting;
- visible packages filtered by active sale availability;
- registration, login, password recovery, and legal/help links;
- responsive design suitable for phones first and desktop second.

Disabled packages must not be purchasable by new customers. Existing entitlements remain valid.

## 4. Student application

The authenticated student experience must provide:

- onboarding and required profile completion;
- package/trial status and expiry messaging;
- one active manual study plan;
- daily schedule and task completion;
- subjects and chapters loaded from the database;
- summaries, notes, worksheets, answer keys, and protected PDF access;
- practice MCQs and automatically scored online tests;
- existing PDF/mock tests with manually entered scores;
- attempt history, schedule adherence, subject/chapter performance, streaks, and reports;
- archived academic-year history;
- expired-access mode limited to profile, package purchase, and historical reports.

## 5. Administrative application

### SuperAdmin capabilities

- Manage Account Managers and all students.
- Manage packages, fixed expiry dates, pricing, trial duration, and sale availability.
- Manage global and package-level configuration.
- Create, edit, archive, version, and publish subjects, chapters, resources, MCQs, and tests.
- Upload source PDFs and initiate AI generation of summaries, notes, MCQs, worksheets, answer keys, and tests.
- Review and publish AI-generated drafts.
- View all operational, payment, student, and audit reports.
- Deactivate accounts and retain their records.

### Account Manager capabilities

- Work only with assigned students, except where a specifically delegated global configuration grants broader operational access.
- Activate/deactivate students.
- View assigned-student profiles, parent contact, schedules, scores, and reports.
- Assign or extend packages for assigned students.
- Execute Razorpay refunds.
- Export assigned-student reports.
- Change only configuration explicitly delegated by SuperAdmin.
- Never create or publish curriculum content or manage other Account Managers.

## 6. Package summary

| Package | Price | Validity | v1 functionality |
| --- | ---: | --- | --- |
| Free | ₹0 | Configurable duration; initially 7 days from activation | All current learning features |
| Basic | ₹299 | Until configured academic-year calendar expiry | All current learning features |
| Pro | ₹999 | Until configured academic-year calendar expiry | Same as Basic in v1 |

In v2, Pro adds on-demand tests and on-demand worksheets. Trial subject/chapter restrictions also move to configuration in v2.

## 7. v1 scope

- Supabase authentication and user/profile lifecycle.
- SuperAdmin seed and Account Manager administration.
- Razorpay checkout, verification, webhooks, transactions, and refunds.
- Academic-year packages and entitlements.
- Database-driven subjects, chapters, questions, tests, and resources.
- Private Supabase Storage resources.
- Manual schedule wizard with one active plan.
- Student progress and reports.
- Daily verified-parent email reports through Resend.
- Append-only meaningful activity auditing.
- Immediate feature configuration.
- Migration of all existing learning content and four existing mock tests.

## 8. Explicitly out of scope for v1

- Multiple active study plans.
- Automatically generated study schedules.
- On-demand AI tests or worksheets for students.
- Trial content restrictions by subject/chapter.
- Teacher, school, parent-login, or institution tenancy roles.
- Scheduled future configuration changes.
- International time zones or non-India markets.
- Migrating Daksh's locally stored schedule, attempts, or scores.
- Automatic publication of AI-generated learning content.

## 9. Success and acceptance indicators

- No student can read or mutate another student's private data.
- A verified student can register, receive a trial, build a plan, study, submit assessments, and view reports.
- A paid entitlement is created only after trusted Razorpay verification or an authorized admin assignment.
- Content and tests render from Supabase rather than bundled JSON.
- Daily parent reports are generated once per eligible scheduled day and are idempotent.
- Administrative mutations and meaningful student activity produce immutable audit events.
- Expired and deactivated access behaves according to these specifications.

