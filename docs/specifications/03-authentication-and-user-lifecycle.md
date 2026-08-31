# Authentication and User Lifecycle

## 1. Authentication

- Supabase Auth email/password is the only v1 authentication method.
- Email verification is required before application access.
- Supabase Auth sends verification and password-reset messages.
- Sessions use the Supabase client and secure platform defaults.
- The current time-derived shared lock screen must be removed.

## 2. Registration workflow

1. Visitor views enabled packages on the public site.
2. Visitor selects Free, Basic, or Pro.
3. Visitor creates an email/password account.
4. A pending application profile records the selected package intent.
5. Supabase sends email verification.
6. After verification, the platform collects/validates all required profile fields.
7. Free selection activates the trial immediately.
8. Basic/Pro selection opens Razorpay checkout.
9. Failed or abandoned payment leaves the student on the Free trial.
10. Verified payment creates the paid entitlement.
11. A student without a study plan is directed to the schedule wizard.

Registration and payment callbacks must be resumable. Reloading or signing in on another device must recover the correct onboarding step from server state.

## 3. Profile fields

Required:

- full name;
- verified email;
- phone number (collected, not verified in v1);
- school name;
- city;
- date of birth;
- class/grade;
- education board;
- target exam date.

Optional:

- parent/guardian name;
- parent/guardian email.

The initial product serves CBSE Class 10, but board/class fields are retained for future curricula.

## 4. Parent verification

- Adding or changing a parent email creates an unverified contact.
- Resend sends a clear consent/verification message to the parent.
- Notifications begin only after the parent verifies the address.
- Student, assigned Account Manager, or SuperAdmin may change the contact.
- Changing the address invalidates prior verification and requires a new consent message.
- Only one parent contact is supported in v1.

## 5. Trial eligibility

- Trial eligibility is limited to one verified email and phone-number combination.
- The server checks trial history before granting a trial.
- Re-registration or account deactivation must not reset trial eligibility.
- Suspected duplicates may be flagged for administrative review; payment data must not be used as an authentication factor.

## 6. Account states

| State | Meaning | Access |
| --- | --- | --- |
| Pending verification | Auth identity created; email unverified | Verification/resend only |
| Onboarding | Verified; profile or initial flow incomplete | Onboarding only |
| Active | Verified and not deactivated | According to entitlement |
| Expired entitlement | Account active; no current entitlement | Profile, purchase, historical reports |
| Deactivated | Operationally suspended | Login/application blocked |

## 7. Deactivation/reactivation

- Deactivation blocks access immediately and preserves all records.
- Entitlement time continues during deactivation.
- Reactivation restores access appropriate to the entitlement's current status.
- Actor, reason, timestamp, and before/after state are audited.
- v1 has no hard-delete workflow.

## 8. Academic-year rollover

- Students retain their identity and historical reports.
- A new academic year requires a new package entitlement and a new active study plan.
- The previous plan becomes archived.
- No historical attempt or schedule record is overwritten.

