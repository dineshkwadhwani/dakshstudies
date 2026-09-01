# Technical Architecture and Integrations

## 1. Target architecture

```text
Browser (React/Vite on Vercel)
  ├─ Supabase Auth session
  ├─ Supabase client for RLS-protected reads/realtime-safe writes
  └─ Vercel server endpoints for trusted workflows
       ├─ Supabase service/database functions
       ├─ Razorpay API and webhook
       ├─ Resend API
       └─ AI content provider/worker

Supabase
  ├─ PostgreSQL + RLS
  ├─ Auth
  └─ Private Storage
```

## 2. Frontend

- Retain React, React Router, Vite, and Tailwind initially.
- Add public, authentication, student, and admin route shells.
- Replace hard-coded Daksh personalization with the authenticated profile.
- Add a typed data-service/query layer so pages do not call local storage directly.
- Handle loading, empty, expired, deactivated, unauthorized, retry, and offline states.
- Keep role navigation derived from server-authorized profile/permissions.

## 3. Trusted server endpoints

Vercel Functions/Route handlers are required for:

- Razorpay order creation, verification, webhooks, upgrades, and refunds;
- Resend parent verification and daily reports;
- Supabase signed resource URLs;
- Account/entitlement administrative operations requiring atomic audit;
- AI processing job orchestration;
- CSV export;
- cron-triggered expiry, missed-task, notification, and retention jobs.

Every endpoint validates authentication/role, validates inputs, uses idempotency keys, returns sanitized errors, and records correlation IDs.

## 4. Environment variables

Exact names should be standardized during implementation. Categories:

- browser-safe Supabase URL and anonymous key (`VITE_`-exposed);
- server-only Supabase service-role key;
- Razorpay public key plus server-only secret/webhook secret;
- Resend server-only API key and sender identity;
- AI provider server-only credentials;
- initialization/seed SuperAdmin identity;
- application base URL and cron secrets.

`.env.local` remains ignored. A secret-free `.env.example` must document required variables. Server secrets must never use the Vite public prefix.

## 5. Razorpay

- Amount/package truth comes from the database, never request parameters alone.
- Webhooks verify the raw-body signature.
- Provider event/order/payment IDs are uniquely stored.
- Processing is idempotent and retry-safe.
- Browser receives no Razorpay secret.

## 6. Resend and scheduled jobs

- Supabase Auth owns verification/password-reset email.
- Resend owns parent verification, daily reports, payment/application messages, and editable templates.
- SuperAdmin-managed templates require variable validation, preview/test-send, version history, and safe rendering.
- Vercel Cron invokes authenticated endpoints; database uniqueness prevents duplicates.

## 7. AI processing

- Generation runs asynchronously because PDF extraction and model calls may exceed request latency.
- Jobs expose queued/processing/review/failed states.
- Source and output remain private.
- Content is schema-validated and requires SuperAdmin publication.
- Provider/model abstraction prevents the database design from depending on one AI vendor.

## 8. Environments and deployment

- Product decision specifies production-only infrastructure for v1 (`N5-C`).
- Local development still uses local environment variables and should target a safe development Supabase project where possible.
- Vercel deploys the production frontend/functions.
- Database migrations are version-controlled and applied through CI/manual approval.
- Production secrets are stored in Vercel/Supabase secret stores.
- Supabase-managed backups are used in v1.

Production-only infrastructure increases release risk; database migrations and payment/email tests must therefore have strong local or isolated test coverage before release.

## 9. Non-functional requirements

- Authorization isolation tested automatically.
- Payment/email/webhook workflows idempotent.
- Core mobile pages usable on slow connections.
- Accessible forms, keyboard navigation, labels, and readable contrast.
- Structured logs without secrets or sensitive payloads.
- Monitoring for API errors, webhook failures, cron failures, AI jobs, and database capacity.
- Content-heavy routes use pagination/lazy loading; large MCQ banks are not shipped wholesale to every browser.

