# Tenth Ki Padhai / Daksh Study Platform: Current Functionality

## Document status

Audited: 24 October 2026

This document describes the current repository implementation, not only the target product specification. It was checked against the root React/Vite application in `src/`, server endpoints in `api/`, Supabase migrations, content/import scripts, automated tests, and the project documentation.

The root application is canonical. The older `portal/` copy described by earlier documentation is not the active application surface.

## Product overview

Tenth Ki Padhai is a mobile-first CBSE Class 10 study platform. It combines account registration, package access, personalized study plans, chapter resources, online MCQ quizzes, scheduled mock tests, progress reporting, referrals, and administrative operations.

The product has moved from the original Daksh-only static portal toward an authenticated multi-user platform. The current learner application is database-backed when Supabase is configured. Some legacy static data and local-storage utilities remain in the repository, but they are not the primary path used by the current routed student screens.

## Current implementation summary

### Implemented in the current root application

- Supabase Auth session handling with persistent sessions and token refresh.
- Email/password login, registration, email verification flow, password reset, and password update.
- Student onboarding and profile completion.
- Roles: `student`, `account_manager`, and `super_admin`.
- Account activation/deactivation handling.
- Database-backed subjects, chapters, resources, assessments, plans, tasks, quiz attempts, entitlements, and package data.
- Free trial assignment and package selection during registration.
- Razorpay browser checkout setup and server-side payment-signature verification.
- Package upgrade flow and coupon-code review flow.
- Protected learning-resource URL generation through a trusted API endpoint.
- Secure answer-key release checks in database authorization functions.
- Student study-plan creation, task scheduling, completion, mock-test scheduling, and test completion.
- Database-backed 25-question MCQ quizzes in Practice and Test modes.
- Topic summary browsing and SuperAdmin topic editing/publishing.
- SuperAdmin and Account Manager operations.
- Referral-code capture and referral reporting.
- Public landing, contact, legal, privacy, and refund-policy pages.
- Security and topic-validation tests.

### Implemented database/API scaffolding but not fully exposed as a product workflow

- Payment webhook-event storage exists, but there is no Razorpay webhook endpoint in `api/`.
- Refund tables and refund policy content exist, but no complete refund execution API/UI is present in the current repository.
- Parent-contact, daily-parent-report, email-template, and notification tables exist, but the scheduled parent-report pipeline is not implemented in the current `api/` directory.
- AI-generation job schema exists and topic-drafting scripts use Groq when explicitly invoked, but there is no asynchronous production job worker or SuperAdmin AI-job workflow.
- Manual mock-test score storage exists in the schema, but the current student `Tests` screen uses scheduled test attempts and does not expose the old manual mark-entry workflow.
- Configuration delegation tables exist, but the visible admin configuration UI is primarily SuperAdmin-oriented.

## Public experience

Routes available without an authenticated session:

| Route | Current behavior |
| --- | --- |
| `/` | Public Tenth Ki Padhai landing page with product positioning and package cards. |
| `/login` | Email/password login. |
| `/register` | Student registration with package selection, name, email, Indian phone, city, password, optional referral code, and Turnstile in non-development environments. |
| `/forgot-password` | Password-reset request. |
| `/update-password` | Set a new password after the reset flow. |
| `/contact` | Contact form with server delivery through Resend when configured, honeypot, request-size limits, rate limiting, and Turnstile protection in production. |
| `/terms` | Terms of service. |
| `/privacy` | Privacy policy and third-party service disclosures. |
| `/refund-policy` | Cancellation and refund policy. |

The landing page shows Free Trial, Basic, and Pro package information. Package data is normally loaded from the current academic year and published sale-enabled records, with local fallback marketing data when the public package query is unavailable.

## Authentication and account lifecycle

### Authentication behavior

- Supabase Auth is the identity provider.
- Email/password is the supported sign-in method.
- Email verification is required by the registration flow before normal account use.
- Sessions are persisted in the browser and auto-refreshed by the Supabase client.
- The old time-derived shared lock screen is no longer the active authentication model.
- The application shows a configuration message when the public Supabase URL/key are not available.

### Account states and guards

`ProtectedRoute` enforces the following behavior:

- unauthenticated visitors are sent to `/login`;
- users whose profile cannot be loaded receive an error state;
- deactivated users are blocked and shown a sign-out action;
- incomplete students are redirected to `/onboarding`;
- role-restricted routes redirect unauthorized users to `/dashboard`.

### Registration

Registration validates name, email, Indian mobile number, city, password length, package code, and optional referral code in both the browser and trusted server endpoint. Production registration requires a successful server-side Cloudflare Turnstile verification. The server also applies IP/email rate limits and records registration failures in the audit log.

Free registration receives the configured trial entitlement. Basic/Pro registration creates a pending payment transaction and Razorpay order when payment configuration is available. If paid checkout cannot start or is abandoned, the user remains on the Free trial path.

### Profiles and onboarding

Student onboarding collects full name, phone, school name, city, date of birth, target exam date, and optional parent/guardian name and email. The current curriculum label is CBSE Class 10. Students can later edit profile/contact information through `/profile`.

Parent contact details are stored, but parent verification and scheduled reporting are not yet a complete end-to-end workflow.

## Packages, entitlements, and payments

The database separates package definitions, payment transactions, student entitlements, features, refunds, webhook-event records, and coupons.

The seeded marketing defaults are:

| Package | Default price | Default access/allowance |
| --- | ---: | --- |
| Free Trial | ₹0 | 7 days; 10 quiz attempts |
| Basic | ₹299 | Academic-year access; 100 quiz attempts |
| Pro | ₹999 | Academic-year access; 300 quiz attempts |

Actual availability, price, expiry, feature flags, and quiz allowance are database/configuration values and may differ from the defaults.

### Current payment flow

1. The student selects a package.
2. The trusted registration or upgrade endpoint validates the current academic year and sale-enabled package.
3. A pending internal transaction is created.
4. The server creates a Razorpay order and returns only the public checkout key/order information.
5. The browser opens Razorpay Checkout.
6. The browser result is submitted to `/api/verify-payment`.
7. The server verifies the Razorpay HMAC signature and records the paid transaction/entitlement.
8. Coupon redemption is recorded when a discounted transaction is completed.

The repository also has `/api/payment-fallback` for failed/cancelled browser outcomes and `/api/upgrade-payment` for authenticated upgrades. A separate webhook handler is still required for provider-authoritative asynchronous payment reconciliation.

## Student application

Authenticated student routes are rendered inside the shared responsive `Layout` with account menu, profile/referral links, and mobile bottom navigation.

### Dashboard

`/dashboard` provides:

- personalized greeting and profile initials;
- current package/entitlement state;
- trial-expiry or paid-upgrade messaging;
- current study-plan progress;
- today’s scheduled tasks;
- a `Review plan` link to the full schedule calendar;
- quiz-attempt count and package allowance;
- average quiz score and activity streak indicator;
- recent quiz activity;
- links to chapters, schedule, mock tests, progress, profile, and referrals.

### Study plans and schedule

`/schedule` uses database-backed `study_plans` and `schedule_tasks` records.

Current behavior includes:

- choose a Daily, One-week, or Multi-week plan type;
- show Multi-week as locked for Free users with an upgrade link;
- create one active plan with a plan type stored on `study_plans`;
- use a month calendar for Daily plans and week navigation for weekly/multi-week plans;
- select any date to open a task modal;
- add multiple tasks on the same date;
- add Study tasks for a selected subject/chapter;
- add Test tasks filtered to assessments belonging to the selected subject;
- enforce a seven-total-task limit for Free Daily plans in the UI and schedule-rule trigger;
- edit task date/type/subject/chapter/test;
- remove tasks using the cancelled status so history is retained;
- mark tasks complete or open again; completed dates remain editable;
- display green, red, or partial calendar status based on task completion/missed state;
- mark overdue active-plan tasks as missed when the student loads the schedule, using the configured IST cutoff;
- display scheduled, completed, missed, rescheduled, and cancelled task states when present.

Mock tests can also be scheduled directly from `/tests`, either for a selected date or immediately for today.

### Subjects, chapters, and topics

`/chapters` and `/chapters/:subject` load published subjects and chapters from Supabase. Subjects support parent/child hierarchy, allowing Social Science sections such as Geography, History, Civics, and Economics.

`/chapter/:subject/:chapterId` displays chapter identity, subject hierarchy, published resource links, topic list, chapter quiz entry point, protected summaries/notes/worksheets/answer keys/source material, and resource loading/error states.

`/chapter/:subject/:chapterId/topic/:topicSlug` displays a published topic summary with validated, restricted HTML markup and source metadata where present.

The topic system supports published/draft/archived states. Published summaries are constrained to 200–500 words and allow only a restricted tag set, including paragraphs, headings, lists, emphasis, blockquotes, line breaks, superscript, and subscript markup.

### Learning resources and PDFs

Learning files are stored in the private Supabase Storage bucket `learning-content`. Student code does not create signed URLs directly and does not receive raw storage paths. It calls `/api/learning-resource-url`, which delegates authorization to the database function `authorize_learning_resource`.

Authorization checks include the authenticated user, active account, entitlement/feature access, published resource state, and answer-key release rules. Answer keys can be restricted until the related test/attempt is submitted.

`PdfView` and `PdfModal` render authorized PDF resources through `react-pdf`, with a browser-open/download fallback when inline rendering is unavailable.

### Online chapter quizzes

`/quiz/:subject/:chapterId` uses Supabase RPC functions rather than local score storage:

- `start_chapter_quiz` creates the attempt and returns the question set;
- the browser shuffles question options for the session;
- Practice mode reveals correctness after each answer;
- Test mode uses a 25-minute client countdown and reveals results only after submission;
- unanswered questions are submitted as unanswered and graded by the server;
- `submit_chapter_quiz` stores the attempt, responses, score, percentage, duration, and linked schedule completion where applicable;
- package quiz allowance is checked before starting an attempt;
- results show score, percentage, correct/wrong/skipped state, and question review;
- a retake path is available.

The database schema stores attempt/question/response records, enabling historical results to remain independent of later question edits.

### Mock tests

`/tests` loads published `pdf_mock_test` assessments from the database.

Current student behavior includes:

- four migrated/available PDF mock tests in the content set;
- scheduling a test for a date;
- starting a scheduled or unscheduled test immediately;
- tracking an in-progress/manual assessment attempt;
- finishing the attempt through `finish_mock_test`;
- releasing answer keys after completion;
- viewing question-paper and answer-key resources through protected resource access.

The current UI does not provide the old local-storage workflow for entering separate Maths/Science/Social Science marks.

### Progress and reports

`/progress` reports database-backed student activity, including study-plan/task completion, quiz attempts and performance, chapter/subject coverage, recent activity, and mock-test/assessment status where available.

The current dashboard quiz average is based on the submitted attempts returned by `useQuizAttempts`; it is not the old local-storage “best score per chapter” calculation described by the obsolete functionality document.

### Referrals

`/referrals` exposes a student referral view based on referral code and referral records. Registration accepts referral codes, validates them through Supabase, and stores acquisition/referrer information. SuperAdmin user management can search referral and acquisition fields.

## Administrative application

Administrative routes are protected by role checks. SuperAdmin receives the full admin navigation; Account Managers receive a reduced user-management view.

| Route | Current capability |
| --- | --- |
| `/admin/subjects` | Create published subjects and chapters; view current catalogue. |
| `/admin/content` | Upload and publish PDF resources to private Supabase Storage for a chapter. |
| `/admin/topics` | Create, edit, validate, preview, publish, archive, and order chapter topic summaries. |
| `/admin/users` | Search/filter users; create Account Managers as SuperAdmin; view student details; activate/deactivate users; send verification/reset email; assign Account Managers; start SuperAdmin impersonation. |
| `/admin/config` | Manage package/configuration values exposed by the current admin page. |
| `/admin/coupons` | Create, edit, activate/deactivate, expire, and bulk-generate coupon codes. |
| `/admin/transactions` | Review payment and upgrade transactions. |
| `/admin/audit` | Filter and review recent audit events, failures, user events, and registration events. |

The repository contains an `AdminDashboard.jsx` component, but the current `App.jsx` route table does not expose a separate `/admin/dashboard` route; administrators currently land on the shared `/dashboard` route.

### Account Manager behavior

Account Managers can access the user-management surface subject to database assignment/role policies. SuperAdmin-only operations include creating managers, managing curriculum/content/package configuration, assigning students, and broader audit/transaction administration.

Server endpoints validate the authenticated actor and, for Account Managers, check active student assignment before allowing user-contact operations.

### Impersonation

SuperAdmin can request a generated Supabase magic-link session for another user through `/api/impersonate`. The frontend stores the original session details in `sessionStorage`, shows a “Viewing as” banner, and provides a return-to-SuperAdmin action. This is functional but remains a security-hardening item because the current design stores the original refresh token in browser session storage and does not enforce MFA/recent reauthentication.

## Content and data inventory

### Source content

The repository contains legacy static source files:

- `src/data/mcqs.json`;
- `src/data/schedule.json`;
- `src/data/tests.json`;
- bundled PDF files under `public/pdfs/`.

The active database migration/import path is intended to import the canonical learning content into Supabase. The importer documents these expected quantities:

- 50 chapters;
- 2,500 versioned MCQs;
- 10,000 question options;
- 50 chapter quiz definitions;
- four PDF mock tests;
- the bundled PDF resource set.

The current active catalog hooks read subjects, chapters, resources, assessments, and topics from Supabase rather than importing the JSON directly in the routed student experience.

### Main Supabase entities

The migrations define tables for boards, grades, academic years, curricula, subjects, chapters, content resources and versions, chapter topics, question banks/questions/versions/options, assessments/sections/resources, packages/features/entitlements, payments/webhooks/refunds/coupons, study plans/tasks/history, assessment attempts/responses, profiles/parent contacts/manager assignments/referrals, configuration, daily parent reports, email templates, AI-generation jobs, and audit events.

## Persistence and legacy code

The current primary learner data path is Supabase. However, the repository still contains legacy browser storage utilities:

- `src/hooks/useStorage.js` uses the `daksh_portal_v1` local-storage namespace;
- `src/hooks/useData.js` contains the former static MCQ/schedule/test helpers and local progress migrations;
- `Home.jsx` is a legacy/local-storage-oriented dashboard component and is not the routed dashboard; `App.jsx` routes `/dashboard` to `Dashboard.jsx`;
- analytics consent is intentionally stored in local storage under `tenthkipadhai_analytics_consent`;
- impersonation session state is stored in browser `sessionStorage`.

The old local quiz scores, schedule check-offs, and mock-test scores are not migrated into the database by the current migration scripts. They should be treated as legacy compatibility code, not as the authoritative multi-user progress store.

## Security controls currently present

- Supabase Row Level Security policies across learner, staff, content, payment, schedule, attempt, and audit tables.
- Role and account-status checks in protected routes and trusted APIs.
- Server-side Turnstile verification for production registration/contact flows.
- IP/email/API rate-limiting support backed by the database.
- Request body-size checks and trusted forwarded-IP handling.
- HMAC verification for Razorpay browser payment responses.
- Private learning-content storage and database-authorized signed URL generation.
- Answer-key release enforcement after the related submission.
- Restricted topic HTML parser and word-count validation.
- Escaped/math-safe rendering for quiz text and options.
- Audit events for important authentication, registration, user-management, profile, and quiz activity.
- No browser exposure of service-role or payment-secret values through the application code.

These controls are repository behavior and still require deployment configuration and production smoke testing to be considered operationally complete.

## Known gaps and active hardening work

The security backlog in `docs/security-hardening-todo.md` remains the authoritative open-work list. The most important current items are:

1. Rotate previously exposed or incorrectly scoped credentials and verify server-only secret storage.
2. Complete coordinated deployment/smoke testing for protected resource and answer-key authorization.
3. Upgrade routing dependencies and close redirect paths.
4. Add production browser security headers/CSP.
5. Tighten every security-definer function and RLS path for active status, entitlement, role, and ownership.
6. Require MFA/recent reauthentication for privileged operations and replace browser-stored impersonation refresh tokens.
7. Make security audit events authoritative rather than relying on client-reported events for critical activity.
8. Harden content uploads with MIME/signature/size validation and malware/quarantine controls.
9. Add broader authorization, abuse, integration, accessibility, and end-to-end regression coverage.

Product/integration gaps visible from the current repository are:

- no Razorpay webhook route or asynchronous payment reconciliation worker;
- no complete refund execution workflow;
- no implemented Resend parent-verification/daily-report scheduler;
- no production AI generation/review job worker;
- no visible manual mock-test mark-entry experience;
- no separate admin dashboard route;
- no configured lint script or browser end-to-end test suite;
- no automatic local-to-account migration for the original Daksh browser progress;
- no evidence in this repository alone that hosted Supabase migrations, Vercel secrets, Razorpay webhooks, Resend, or cron jobs are currently deployed and configured.

## Tooling and verification

Available commands include:

```bash
npm run dev
npm run build
npm run preview
npm run test:security
npm run test:topics
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npm run migrate:content
npm run migrate:content:apply
```

Audit verification performed for this document:

- `npm run build` passed.
- `npm run test:security` passed: 14 tests.
- `npm run test:topics` passed: 5 tests.

The production build reports large JavaScript/PDF worker chunks above Vite’s 500 kB warning threshold. This is a performance warning, not a build failure.

## Current routes

| Route | Access | Screen |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login` | Public | Login |
| `/register` | Public | Registration/package selection |
| `/forgot-password` | Public | Password reset request |
| `/update-password` | Auth flow | Password update |
| `/contact` | Public | Contact form |
| `/terms` | Public | Terms |
| `/privacy` | Public | Privacy |
| `/refund-policy` | Public | Refund policy |
| `/onboarding` | Authenticated incomplete student | Profile onboarding |
| `/dashboard` | Authenticated | Student/admin dashboard |
| `/schedule` | Student | Study plan and schedule |
| `/chapters` | Student | Subject browser |
| `/chapters/:subject` | Student | Subject chapter list |
| `/chapter/:subject/:chapterId` | Student | Chapter details/resources |
| `/chapter/:subject/:chapterId/topic/:topicSlug` | Student | Topic summary |
| `/quiz/:subject/:chapterId` | Student | Online chapter quiz |
| `/tests` | Student | Scheduled PDF/mock tests |
| `/pdf/*` | Student | Authorized PDF viewer |
| `/progress` | Student | Progress reports |
| `/results/:attemptId` | Student | Attempt-result route |
| `/profile` | Authenticated | Profile/contact management |
| `/referrals` | Authenticated | Referral activity |
| `/admin/subjects` | SuperAdmin | Subject/chapter administration |
| `/admin/content` | SuperAdmin | PDF content upload |
| `/admin/topics` | SuperAdmin | Topic editing/publishing |
| `/admin/users` | SuperAdmin/Account Manager | User operations |
| `/admin/config` | SuperAdmin | Configuration/package administration |
| `/admin/coupons` | SuperAdmin | Coupon administration |
| `/admin/transactions` | SuperAdmin | Payment transaction review |
| `/admin/audit` | SuperAdmin | Audit log |

## Source-of-truth guidance

When implementation and older documentation disagree, use this order:

1. Current routed code and trusted API behavior.
2. Applied Supabase migrations and RLS policies.
3. Passing automated tests.
4. Import scripts and source-data counts.
5. Product specifications and README claims.

The specification set remains the intended v1 direction, but it should not be read as proof that every planned integration is implemented or deployed.
