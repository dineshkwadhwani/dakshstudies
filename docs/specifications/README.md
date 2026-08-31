# Daksh Study Platform — Specification Set

Status: Draft for stakeholder review  
Target release: v1 multi-user platform  
Market/time zone: India / `Asia/Kolkata`

## Purpose

These documents define the conversion of the current single-student static portal into a multi-user CBSE Class 10 learning platform. They are the product and technical baseline that must be approved before implementation or database initialization begins.

## Documents

1. [Product requirements and scope](01-product-requirements.md)
2. [Roles and permissions](02-roles-and-permissions.md)
3. [Authentication and user lifecycle](03-authentication-and-user-lifecycle.md)
4. [Packages, payments, and entitlements](04-packages-payments-entitlements.md)
5. [Student onboarding and scheduling](05-student-onboarding-and-scheduling.md)
6. [Content management and AI generation](06-content-management.md)
7. [Parent email notifications](07-parent-email-notifications.md)
8. [Audit and reporting](08-audit-and-reporting.md)
9. [Database design](09-database-design.md)
10. [Supabase Row Level Security](10-supabase-rls.md)
11. [Technical architecture and integrations](11-technical-architecture.md)
12. [Migration and implementation plan](12-migration-and-implementation.md)

The existing application is documented separately in [CURRENT_FUNCTIONALITY.md](../../CURRENT_FUNCTIONALITY.md).

## Normative language

- **Must**: required for v1 acceptance.
- **Should**: expected unless an implementation constraint is approved.
- **May**: optional.
- **v2**: explicitly outside the v1 release.

## Locked product decisions

- Roles are SuperAdmin, Account Manager, and Student.
- Supabase provides authentication, PostgreSQL, Storage, and authorization through RLS.
- Razorpay processes one-time Basic and Pro purchases.
- Resend sends application and parent emails; Supabase Auth sends verification and password-reset emails.
- Free is a configurable seven-day trial. Basic and Pro use fixed academic-year expiry dates.
- One active study plan is allowed per student in v1; archived plans are retained.
- Existing content is migrated, but Daksh's local schedule and scores are not.
- Vercel hosts the frontend and trusted server endpoints.
- Configuration changes are immediate, not scheduled.

## Approval rule

Changes to a locked requirement must be reflected in every affected specification before implementation. Database migrations, RLS policies, payment activation, and audit behavior require explicit review because errors in these areas can expose student or payment data.

