# Security hardening backlog

This backlog was created from the September 2026 static code review, production dependency audit, linked Supabase schema lint, and live response-header inspection.

Priority definitions:

- **P0 — Immediate:** credible account compromise, privileged-session exposure, confidential-content disclosure, or active abuse risk. Complete before increasing production traffic.
- **P1 — High:** material security weakness that should be completed immediately after P0.
- **P2 — Medium:** defense-in-depth, integrity, privacy, and operational hardening.
- **P3 — Ongoing:** security-process maturity and recurring controls.

## P0 — Immediate

- [ ] **SEC-P0-01: Eliminate stored XSS in questions and answers** *(implemented and tested locally; awaiting deployment smoke test)*
  - Replace unsafe `dangerouslySetInnerHTML` processing with escaped output or a strict sanitizer.
  - Preserve only the required superscript and subscript formatting.
  - Cover quiz questions, options, and attempt-result snapshots.
  - Add tests containing `<script>`, event-handler attributes, malicious links, and ordinary maths notation.
  - Done when supplied content cannot create executable DOM nodes.

- [ ] **SEC-P0-02: Enforce server-side authorization for learning files and answer keys** *(implemented and tested locally; awaiting coordinated app/database deployment and smoke test)*
  - Stop returning answer-key storage paths before submission.
  - Remove bucket-wide signed-URL creation from the browser.
  - Introduce a trusted resource-download function accepting a resource/version ID rather than a path.
  - Verify active account, entitlement, published state, package feature, and answer-key release policy.
  - Add tests proving that guessed paths, unpublished resources, and pre-submission answer keys are denied.

- [x] **SEC-P0-03: Rotate and correctly scope exposed secrets** *(completed by owner)*
  - Rotate the previously exposed Resend API key.
  - Remove the `VITE_` prefix from the Turnstile secret and rotate it if it was deployed.
  - Confirm service-role, database, Razorpay, Groq, and administrative credentials exist only in server-side secret storage.
  - Remove long-lived SuperAdmin passwords from developer environment files where possible.
  - Done when old credentials are revoked and the deployed application works with replacements.

- [ ] **SEC-P0-04: Protect anonymous registration, contact, and audit endpoints from abuse** *(implemented and tested locally; awaiting configuration and deployment verification)*
  - Verify Turnstile tokens server-side; do not rely only on displaying the widget.
  - Add IP/device/email rate limits for registration and contact submissions.
  - Rate-limit or redesign anonymous `registration.failed` audit ingestion.
  - Add request-body size limits and return `429` responses with safe retry behavior.
  - Add abuse tests for repeated, parallel, and forged requests.

## P1 — High

- [ ] **SEC-P1-01: Upgrade vulnerable routing dependencies and close redirect paths**
  - Upgrade `react-router-dom`, `react-router`, and `@remix-run/router` to versions without the reported advisories.
  - Allow only known internal destinations for PDF `back` navigation and every other redirect.
  - Re-run `npm audit --omit=dev` and application routing tests.

- [ ] **SEC-P1-02: Add production browser security headers**
  - Add and test Content Security Policy, `frame-ancestors`, `X-Content-Type-Options`, Referrer Policy, and Permissions Policy.
  - Keep HSTS enabled.
  - Roll out CSP in report-only mode first if required by Analytics, Turnstile, PDF workers, or Supabase connections.

- [ ] **SEC-P1-03: Tighten RLS and security-definer business authorization**
  - Require active status and the correct role for study-plan and schedule mutations.
  - Require entitlement where the operation consumes paid/trial functionality.
  - Review every `security definer` function for explicit authentication, role, ownership, status, and object-state checks.
  - Add negative tests for deactivated users, Account Managers, unrelated students, and expired entitlements.

- [ ] **SEC-P1-04: Harden privileged authentication and impersonation**
  - Require MFA for SuperAdmins and Account Managers.
  - Require recent reauthentication before impersonation or other destructive administration actions.
  - Replace browser-stored original SuperAdmin refresh tokens with short-lived server-managed impersonation sessions.
  - Audit impersonation start, stop, expiry, failure, and actions performed while impersonating.

- [ ] **SEC-P1-05: Establish deploy-safe server validation for registration**
  - Deploy the phone-enabled application/API before applying the strict registration migration.
  - Apply pending migrations and verify name, email, phone, password, package, and optional-referral behavior.
  - Ensure admin-provisioned Account Manager creation cannot be spoofed through user-controlled metadata.
  - Add integration tests that call Supabase Auth directly, bypassing the UI.

## P2 — Medium

- [ ] **SEC-P2-01: Make security audit events authoritative and tamper-resistant**
  - Move login, password-change, and critical failure events to trusted Auth hooks, server endpoints, or verified webhooks.
  - Mark client-reported events as unverified and prevent them from generating false critical alerts.
  - Add retention, deduplication, event correlation, and alert thresholds.

- [ ] **SEC-P2-02: Harden content uploads**
  - Validate extension, MIME type, PDF signature, size, filename, and destination server-side.
  - Add malware scanning or quarantine before publication.
  - Prevent active or unexpected content types from being served inline.

- [ ] **SEC-P2-03: Review directory access and personal-data exposure**
  - Confirm that every Account Manager genuinely requires access to every student.
  - Minimize returned fields and audit sensitive profile-detail access.
  - Define retention and deletion rules for phone numbers, parent information, IP addresses, and user agents.

- [ ] **SEC-P2-04: Standardize validation and safe error handling**
  - Centralize validation for names, phone numbers, email addresses, UUIDs, slugs, dates, and file paths.
  - Validate the route value used in PostgREST `.or()` filters.
  - Ensure production errors do not expose provider internals, SQL details, tokens, or personal data.

- [ ] **SEC-P2-05: Add database integrity and abuse constraints**
  - Review maximum lengths and format checks for every user-controlled text column.
  - Add safe uniqueness and normalization rules where business identity depends on email or phone.
  - Add quotas for attempts, schedules, audit events, emails, and other user-generated records.

## P3 — Ongoing

- [ ] **SEC-P3-01: Automate dependency and static security checks**
  - Run dependency audit, secret scanning, linting, and SAST on every pull request.
  - Enable automated dependency-update pull requests with regression tests.

- [ ] **SEC-P3-02: Add authorization and abuse regression tests**
  - Maintain a role/action matrix for anonymous, student, Account Manager, SuperAdmin, deactivated, expired, and impersonated sessions.
  - Test RLS directly rather than relying only on UI tests.

- [ ] **SEC-P3-03: Configure monitoring and actionable security alerts**
  - Alert on registration spikes, repeated login/reset failures, privilege changes, impersonation, email-delivery failures, and unusual signed-file access.
  - Document who receives and responds to each alert.

- [ ] **SEC-P3-04: Establish operational security procedures**
  - Document incident response, credential rotation, administrator offboarding, backup restoration, and breach notification procedures.
  - Test database restoration and key rotation periodically.

- [ ] **SEC-P3-05: Schedule independent testing**
  - Perform authenticated DAST and a focused penetration test after P0 and P1 are complete.
  - Reassess before major payment, parent-reporting, or third-party integration changes.

## Execution order

Work through one item at a time in this order:

1. `SEC-P0-01` — stored XSS
2. `SEC-P0-02` — file and answer-key authorization
3. `SEC-P0-03` — secret rotation
4. `SEC-P0-04` — anonymous endpoint abuse protection
5. P1 items in numerical order
6. P2 items in numerical order
7. Establish P3 controls as recurring work

For every completed item: add automated tests, run the production build, run relevant database lint/tests, document any deployment order, deploy, smoke-test in production, and only then mark the checkbox complete.
