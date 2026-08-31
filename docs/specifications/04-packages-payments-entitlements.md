# Packages, Payments, and Entitlements

## 1. Model separation

- A **package** is an editable product offered for an academic year.
- A **payment** is an immutable commercial transaction record.
- An **entitlement** grants one student access for a defined interval.
- A **feature entitlement** maps a package to enabled functionality.

Keeping these separate permits price changes, package disabling, administrative assignment, and historical accuracy.

## 2. Package rules

- Free has a duration in days, initially seven and editable by SuperAdmin.
- Basic is initially ₹299 and Pro ₹999; both prices are editable.
- Basic and Pro have fixed academic-year calendar expiry dates.
- Purchasing near expiry is allowed. The displayed checkout must clearly show the exact expiry date.
- Disabling a package removes it from new selection/purchase but never revokes existing entitlements.
- All v1 packages expose current learning functionality.
- v2 may grant Pro on-demand tests/worksheets and restrict trial content.

## 3. Entitlement rules

- Free begins after verified registration/onboarding and ends after the configured number of days.
- Paid entitlement begins only after verified payment or authorized admin assignment.
- Paid entitlement ends on the package's configured academic-year expiry date, independent of purchase date.
- During an active entitlement, a student may only move to a higher-ranked package.
- Basic-to-Pro upgrade credits the eligible Basic payment against Pro.
- After expiry, the student may purchase any enabled package for the new academic year.
- Historical entitlements are retained.
- An admin extension changes only that student's entitlement, not the package definition.
- Expired users retain profile, purchase, and historical-report access but cannot start/continue learning activity.

## 4. Razorpay purchase workflow

1. Trusted server validates student, selected package, availability, academic year, price, and allowed upgrade.
2. Server creates an internal pending payment and Razorpay order.
3. Browser opens Razorpay Checkout using only the public key and order details.
4. Browser result is sent to a trusted server endpoint for signature verification.
5. Razorpay webhook is processed and stored idempotently.
6. Only trusted verification marks payment successful and creates/updates entitlement.
7. Resend sends a platform confirmation; Razorpay provides its receipt.

Browser success alone must never grant access. Raw webhook payload/hash metadata may be retained securely for dispute diagnosis, but secrets and full payment credentials must never be logged.

## 5. Failed or abandoned payment

- Internal payment remains failed/expired/pending as appropriate.
- Student retains or begins the Free trial if eligible.
- UI permits retry by creating or resuming a safe order flow.
- Duplicate callbacks/webhooks must not create duplicate entitlements.

## 6. Upgrade calculation

- The Basic-to-Pro payable amount is Pro's current price minus eligible Basic credit, never below zero.
- Eligibility, amount, tax treatment, and original transaction linkage are calculated server-side.
- Upgrade creates a new transaction and entitlement event; it does not rewrite payment history.
- Pro expiry remains the configured Pro academic-year expiry.

## 7. Administrative assignment and extension

- SuperAdmin and assigned Account Managers may assign or extend student entitlements.
- Each action requires a reason and records actor/source.
- Administrative actions do not fabricate Razorpay payments.
- Sources include `trial`, `razorpay_purchase`, `razorpay_upgrade`, `admin_assignment`, and `admin_extension`.

## 8. Refunds

- SuperAdmin and assigned Account Managers may execute refunds through trusted server code.
- Refunds reference the original transaction, support Razorpay idempotency, and store status/reason.
- No sensitive card/bank data is stored.
- Refund success must trigger an explicit entitlement review/revocation rule and audit event; learning history remains.
- GST invoicing rules require financial/legal confirmation before implementation.

