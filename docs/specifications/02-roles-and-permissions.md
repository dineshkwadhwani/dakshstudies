# Roles and Permissions

## 1. Authorization principles

- Supabase Auth identifies the user; application tables determine profile and role.
- The database is the authorization boundary. UI hiding is never sufficient.
- Students access only their own private records.
- Account Managers access only assigned students unless a named delegated permission says otherwise.
- SuperAdmin has platform-wide application access, but secrets remain inaccessible through the application.
- Service-role credentials are limited to trusted server code.
- Role and permission changes must be audited.

## 2. Permission matrix

| Capability | Student | Account Manager | SuperAdmin |
| --- | --- | --- | --- |
| View/edit own profile | Yes | Own staff profile | Yes |
| View student profile | Own | Assigned students | All |
| View verified parent contact | Own | Assigned students | All |
| Activate/deactivate student | No | Assigned students | All |
| Create Account Manager | No | No | Yes |
| Manage Account Manager | No | No | Yes |
| Assign Account Manager to student | No | No | Yes |
| View/edit own active schedule | Yes | View assigned only | View all |
| Complete/reschedule own tasks | Yes | No | No by default |
| View learning reports | Own | Assigned students | All |
| Export reports | Own export optional later | Assigned students | All |
| Buy package | Own | No | No |
| Assign/extend package | No | Assigned students | All |
| View payment summary | Own | Assigned students | All |
| Execute refund | No | Assigned students | All |
| Manage package definitions | No | No | Yes |
| Change delegated configuration | No | When granted | Yes |
| Manage subjects/chapters/content | No | No | Yes |
| Publish AI-generated drafts | No | No | Yes |
| View audit reports | No | No | Yes |

## 3. Student assignment

- Each student may be assigned to zero or one Account Manager in v1.
- Reassignment must preserve history and be audited.
- An Account Manager losing an assignment immediately loses access to that student.
- Deactivating an Account Manager removes operational access but does not modify assigned students or their entitlements. SuperAdmin must reassign affected students.

## 4. Delegated configuration

- SuperAdmin defines which configuration keys an Account Manager may modify.
- Delegation is per Account Manager and per configuration key or category.
- Account Managers cannot delegate permissions to others.
- Every configuration change records actor, old value, new value, and timestamp.
- Changes take effect immediately.

## 5. Refund authorization

Both SuperAdmin and the assigned Account Manager may initiate refunds. Refund requests must execute through trusted server code, be checked against the original transaction, be idempotent, and be audited. Successful refunds must update payment status and apply the approved entitlement policy; refunding must never silently delete academic history.

## 6. Seeded SuperAdmin

- The initial SuperAdmin identity must be created through a controlled, repeatable initialization procedure.
- Seed credentials and identifiers come from deployment secrets, never committed SQL literals.
- Initialization must be safe to rerun without creating duplicate administrators.
- Subsequent SuperAdmin creation, if supported, must require an existing SuperAdmin and be audited.

## 7. Deactivation versus deletion

The platform does not hard-delete application accounts in v1. SuperAdmin or permitted Account Managers deactivate them. Deactivation preserves profile, entitlement, learning, payment, notification, and audit records while blocking authentication/application access.

