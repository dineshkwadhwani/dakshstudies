# Content Management and AI Generation

## 1. Curriculum hierarchy

The schema must support future boards/classes while v1 exposes CBSE Class 10:

```text
Board → Grade → Curriculum/Academic Year → Subject → Chapter
                                             ├─ Resources
                                             ├─ Question banks
                                             └─ Assessments
```

Social Science may be represented as a parent subject with Geography, History, Civics, and Economics child subjects.

## 2. Content types

- Chapter summary
- Detailed chapter notes
- Worksheet
- Worksheet answer key
- Chapter/practice MCQs
- Online tests
- PDF/manual mock tests and answer keys
- Source textbook/chapter PDF

Metadata includes title, description, type, display order, status, version, storage object, board/grade/subject/chapter scope, creator, timestamps, and access policy.

## 3. Lifecycle

| Status | Meaning |
| --- | --- |
| Draft | Editable, administrator-only |
| Processing | Upload/AI job running |
| Review | Generated/edited content awaiting approval |
| Published | Student-visible according to entitlement |
| Archived | Hidden from new activity; historical references remain |
| Failed | Processing failed with diagnostic metadata |

Only SuperAdmin manages and publishes content. Published referenced content is archived/versioned rather than hard-deleted.

## 4. PDF and file storage

- Files use private Supabase Storage buckets.
- Database rows store metadata and storage object paths, not public URLs.
- Authorized server endpoints issue short-lived signed URLs after checking user, account, entitlement, publication status, and resource access.
- File type, size, checksum, and malware-validation status should be recorded.
- Replacing a file creates a new resource version rather than silently changing historical assessments.

## 5. AI generation workflow

1. SuperAdmin uploads a chapter source PDF.
2. Server validates and stores it privately.
3. SuperAdmin requests one or more outputs: summary, notes, MCQs, worksheet, answer key, or test.
4. An asynchronous job extracts/processes content and calls the configured AI provider.
5. Generated output is saved as a draft/review version with provenance.
6. Validation checks question structure, answer presence, duplication, and source linkage.
7. SuperAdmin reviews, edits, and explicitly publishes.

AI-generated content must never auto-publish. Prompts, provider/model, source version, job result, reviewer, and publication action must be traceable.

## 6. Questions and assessments

- Questions have stable IDs and immutable published versions.
- MCQs store prompt, ordered options, correct option, explanation where available, difficulty, topic metadata, and source/version.
- Assessment definitions reference question versions or snapshot them at publication.
- Student attempts snapshot the exact presented question and randomized option order.
- Editing a published question creates a new version and does not change historical scoring.

## 7. Answer-key visibility

- Practice-test answer keys/correct answers may be visible during or immediately after practice as designed.
- Mock-test answer keys are unavailable until that student's submission.
- Authorization must be enforced server-side; hiding a link in the UI is insufficient.

## 8. Migration scope

- Migrate all subjects, 50 chapters, 2,500 stored MCQs, resource metadata, and applicable PDFs.
- Migrate all four existing PDF/manual-score mock tests as additional tests.
- Preserve stable legacy identifiers in migration fields for verification and idempotent reruns.
- Do not migrate Daksh's browser-local schedule, attempts, or scores.

