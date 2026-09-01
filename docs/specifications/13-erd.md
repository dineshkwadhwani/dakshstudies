# Database Entity Relationship Diagram

This ERD is the implementation companion to [Database Design](09-database-design.md). It shows ownership and the main cardinalities; version/audit support columns are omitted for readability.

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : has
  PROFILES ||--o{ STUDENT_MANAGER_ASSIGNMENTS : "student or manager"
  PROFILES ||--o| PARENT_CONTACTS : has
  PROFILES ||--o{ ACCOUNT_STATUS_HISTORY : changes

  BOARDS ||--o{ CURRICULA : contains
  GRADES ||--o{ CURRICULA : contains
  ACADEMIC_YEARS ||--o{ CURRICULA : versions
  CURRICULA ||--o{ SUBJECTS : contains
  SUBJECTS ||--o{ SUBJECTS : parent_of
  SUBJECTS ||--o{ CHAPTERS : contains
  CHAPTERS ||--o{ CONTENT_RESOURCES : has
  CONTENT_RESOURCES ||--o{ CONTENT_RESOURCE_VERSIONS : versions
  CONTENT_RESOURCE_VERSIONS ||--o{ AI_GENERATION_JOBS : source

  CHAPTERS ||--o{ QUESTION_BANKS : has
  QUESTION_BANKS ||--o{ QUESTIONS : contains
  QUESTIONS ||--o{ QUESTION_VERSIONS : versions
  QUESTION_VERSIONS ||--o{ QUESTION_OPTIONS : options

  CURRICULA ||--o{ ASSESSMENTS : defines
  SUBJECTS ||--o{ ASSESSMENTS : scopes
  CHAPTERS ||--o{ ASSESSMENTS : scopes
  ASSESSMENTS ||--o{ ASSESSMENT_SECTIONS : contains
  ASSESSMENT_SECTIONS ||--o{ ASSESSMENT_QUESTIONS : orders
  QUESTION_VERSIONS ||--o{ ASSESSMENT_QUESTIONS : included
  ASSESSMENTS ||--o{ ASSESSMENT_RESOURCES : files

  PROFILES ||--o{ ASSESSMENT_ATTEMPTS : attempts
  ASSESSMENTS ||--o{ ASSESSMENT_ATTEMPTS : attempted
  ASSESSMENT_ATTEMPTS ||--o{ ATTEMPT_QUESTIONS : snapshots
  ATTEMPT_QUESTIONS ||--o| ATTEMPT_RESPONSES : answered
  ASSESSMENT_ATTEMPTS ||--o{ MANUAL_TEST_SCORES : records

  ACADEMIC_YEARS ||--o{ PACKAGES : offers
  PACKAGES ||--o{ PACKAGE_FEATURES : grants
  FEATURES ||--o{ PACKAGE_FEATURES : enabled_by
  PROFILES ||--o{ STUDENT_ENTITLEMENTS : owns
  PACKAGES ||--o{ STUDENT_ENTITLEMENTS : grants
  PROFILES ||--o{ PAYMENT_TRANSACTIONS : pays
  PAYMENT_TRANSACTIONS ||--o{ REFUNDS : refunds

  PROFILES ||--o{ STUDY_PLANS : owns
  ACADEMIC_YEARS ||--o{ STUDY_PLANS : belongs_to
  STUDY_PLANS ||--o{ SCHEDULE_TASKS : contains
  SCHEDULE_TASKS ||--o{ SCHEDULE_TASK_DATE_HISTORY : moves
  SCHEDULE_TASKS o|--o| ASSESSMENT_ATTEMPTS : triggers

  PROFILES ||--o{ DAILY_PARENT_REPORTS : receives_for
  PARENT_CONTACTS ||--o{ DAILY_PARENT_REPORTS : delivered_to
  CONFIG_DEFINITIONS ||--o{ CONFIG_VALUES : current_value
  PROFILES ||--o{ CONFIG_DELEGATIONS : delegated_to
  PROFILES ||--o{ AUDIT_EVENTS : actor_or_subject
```

## Critical constraints

- One `profiles` row per Supabase Auth user.
- At most one current Account Manager assignment per student.
- At most one active parent contact and one active study plan per student.
- Package, entitlement, plan, and curriculum are tied to an academic year.
- Published questions/resources are versioned; attempts retain exact snapshots.
- One parent daily report per student per scheduled date.
- Razorpay provider IDs and webhook event IDs are unique for idempotency.
- Audit events are append-only and expire after one year through a privileged retention job.

