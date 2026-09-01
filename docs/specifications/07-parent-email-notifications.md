# Parent Email Notifications

## 1. Purpose

On every day with scheduled student work, the platform sends one consolidated end-of-day report to the verified parent contact. The report communicates completed and missed work without giving the parent a platform login in v1.

## 2. Eligibility

Send a report only when all are true:

- student account is active;
- the date contains at least one non-cancelled schedule task;
- a parent email exists and is verified;
- parent has not unsubscribed from this notification category;
- no report for the student/date has already been successfully queued/sent.

If no verified parent contact exists, skip email and show the student an in-app reminder. Empty/rest days generate no report.

## 3. Timing

- SuperAdmin configures the daily cutoff/send time; initial value is 10:00 PM IST.
- v1 supports India and `Asia/Kolkata` only.
- A recurring Vercel Cron-triggered trusted endpoint identifies eligible reports.
- Processing must use database/server time, not the student's browser clock.
- The job and Resend requests must be idempotent.

## 4. Daily report content

- Student first name
- Report date
- Scheduled tasks grouped by completed and missed
- Task type, subject/chapter/test title, and completion status
- Overall completed/total count
- Encouraging, neutral language
- Link to notification preferences/unsubscribe
- Platform support/contact details

Do not include quiz answers, passwords, tokens, sensitive profile fields, or unnecessary performance detail.

## 5. Verification workflow

1. Parent contact is added/changed.
2. Server creates a single-use, expiring verification token stored as a secure hash.
3. Resend sends a consent message describing the reports.
4. Parent opens the link and confirms.
5. Server marks contact verified and records consent timestamp/source.
6. Changing the address revokes verification and requires new consent.

## 6. Unsubscribe and preference

- Parent may unsubscribe from non-essential daily reports without affecting the student's account.
- The unsubscribe link uses a secure scoped token and does not require student credentials.
- Student cannot re-enable a parent who unsubscribed; the parent must consent again.
- Verification, consent, and unsubscribe events are audited.

## 7. Delivery handling

- Resend is the application email provider.
- Temporary failures are retried with bounded backoff.
- Permanent failures/bounces stop automatic retries and prompt contact correction.
- v1 does not expose delivery reports in the admin UI (`G6-C`), but minimal operational delivery state must remain in the database/logs for idempotency, retry, and support.
- Full email bodies are not stored in audit events.

## 8. Required records

- parent contact and verification/consent state;
- notification preference/unsubscribe state;
- one daily report record per student/date;
- provider message ID, status, attempt count, and timestamps;
- task-status snapshot used to produce the report.

