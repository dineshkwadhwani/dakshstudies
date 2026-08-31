# Daksh Study Lab: Current Functionality and Multi-User Baseline

## Purpose

Daksh Study Lab is a mobile-first, gamified Class X CBSE study portal currently personalized for one student, Daksh. It combines a fixed 30-day study plan, chapter resources, interactive MCQ quizzes, paper-based mock tests, and progress reporting.

The application is currently a static, client-only React application. Curriculum content is bundled with the site and learner activity is saved in the browser. There is no backend, database, real user account, server-side authorization, or cross-device synchronization.

This document describes the app in the repository root (`src/`, `public/`). A separate `portal/` copy also exists and has diverged from the root implementation; see [Repository observations](#repository-observations).

## Current users and access

- The experience is hard-coded for Daksh in the product name, page title, greeting, avatar initial, and login copy.
- Every route is placed behind a shared lock screen.
- The lock screen accepts a time-derived access code based on the visitor's local date and hour.
- Successful access is remembered only for the current browser tab/session using `sessionStorage`.
- The access check runs entirely in browser JavaScript and explicitly is not real authentication or security.
- There is no sign-up, sign-in identity, sign-out, password recovery, profile, role, parent/teacher account, or user administration.

## Navigation and responsive shell

- Browser-based single-page routing with fallback to the home page for unknown routes.
- Five-item fixed bottom navigation: Home, Schedule, Study, Tests, and Stats.
- Sticky header with back navigation on all non-home screens.
- Mobile-first layout with a maximum content width suitable for tablets/desktop.
- App-like favicon, theme color, safe-area handling, and Vercel SPA routing.
- Bold, neo-brutalist visual design with subject colors, cards, badges, progress bars, animations, and responsive layouts.

## Home dashboard

- Personalized greeting for Daksh and the current local date.
- Resolves the current day against the fixed 30-day schedule.
- Shows today's primary and secondary study tasks with links to their chapters.
- Shows a test-day callout linking to Mock Tests when the secondary task is a test.
- Before the plan begins, shows Day 1 as the upcoming plan.
- After the plan ends, shows the final scheduled day and a schedule-complete message.
- Displays quiz coverage as unique chapters attempted out of 50.
- Displays the average of each attempted chapter's **best** quiz percentage.
- Calculates a completion streak from consecutive fully completed scheduled days.
  - An incomplete current day receives grace and does not immediately break the streak.
  - A normal day requires both study slots.
  - A test day requires only its primary Maths slot for schedule completion.
- Provides quick links to chapters, schedule, mock tests, and progress.
- Shows the three most recently attempted chapter quizzes with last and best scores.

## Study schedule

- Fixed 30-day plan from 10 May 2026 through 8 June 2026.
- Each day has a primary Maths chapter and either:
  - a secondary Science/Social Science chapter, or
  - a scheduled mock test on days 7, 14, 21, and 28.
- Automatically scrolls the schedule to today's row when today's date is within the plan.
- Visually distinguishes today, completed days, partially completed days, past incomplete days, and test days.
- Lets the learner independently mark the primary and secondary chapter slots done/not done.
- Links each scheduled chapter directly to its chapter detail screen.
- Links scheduled test entries to the Mock Tests screen.
- Reports fully completed days out of 30.
- Supports migration of the older whole-day boolean completion format to the current per-slot format.
- A quiz score of at least 60% automatically marks every matching scheduled chapter slot complete.
- Test completion and schedule completion are tracked separately; marking a mock test attempted does not mark its schedule entry complete.

## Subjects and chapters

- Provides 50 chapters across six stored subject sections:
  - Mathematics: 15 chapters
  - Science: 13 chapters
  - Geography: 7 chapters
  - History: 5 chapters
  - Civics: 5 chapters
  - Economics: 5 chapters
- Presents Geography, History, Civics, and Economics together as Social Science in the subject browser.
- Shows per-subject quiz coverage based on the number of chapters with at least one attempt.
- Shows each chapter's resource availability and best quiz score.
- Redirects invalid subject or chapter URLs back to the chapter browser.

## Chapter resources

- Chapter detail screen with subject, chapter number, title, best quiz score, and attempt count.
- Link to the interactive 25-question quiz.
- Links to printable Worksheet A and the corresponding answer key.
- Links to the harder Worksheet B and the corresponding answer key.
- Optional chapter summary link where a summary PDF exists (35 of 50 chapters currently reference one).
- Displays up to five recent quiz attempts with score, percentage, mode, and date.
- Bundles 360 PDF files in `public/pdfs`, including current and legacy/duplicate resource variants.

## Interactive quizzes

- Each chapter contains two 25-question pools, for 50 stored MCQs per chapter and 2,500 MCQs in total.
- Each quiz randomly selects 25 questions from the combined chapter pool.
- Randomizes both question order and answer-option order for every attempt.
- Free navigation between questions using Previous and Next controls.
- Shows answered-question progress and allows unanswered questions.
- Renders Unicode superscript/subscript characters as HTML for mathematical/scientific notation.

### Practice mode

- No timer.
- Reveals correctness immediately after an answer is selected.
- Highlights the correct answer and any incorrect selected answer.
- Locks the question after an answer is revealed.

### Test mode

- 25-minute countdown.
- Does not reveal answers while the attempt is active.
- Prompts for submission at the end or when the timer expires.
- Warns that unanswered questions will be marked wrong.

### Results and review

- Calculates score, percentage, correct count, wrong/skipped count, and elapsed time.
- Shows performance messages for score bands below 50%, 50–74%, 75–89%, and 90%+.
- Provides a color-coded question grid for correct, wrong, and skipped answers.
- Allows reviewing any individual question with the selected and correct options shown.
- Provides a shortcut to start reviewing from the first wrong/skipped answer.
- Allows retaking the quiz or returning to the chapter.
- Saves attempt mode, score, total, percentage, timestamp, duration, and selected answers.
- Stores at most the 10 most recent attempts per chapter while preserving the best percentage and last attempt.

## Mock tests

- Four scheduled mock tests; Test 4 is labeled cumulative.
- Each test contains three 80-mark papers: Maths, Science, and Social Science.
- Provides question-paper and answer-key PDFs for every paper.
- Supports marking an entire test attempted/not attempted.
- Supports entering and editing marks from 0 to 80 for each paper.
- Entering any paper score automatically marks the test attempted.
- Unmarking a test clears all scores recorded for it.
- Shows the aggregate percentage over only the papers whose scores have been entered.
- Shows Today and Overdue status based on the visitor's local date.
- Supports migration from an older boolean attempted/not-attempted storage format.

## PDF viewer

- Displays bundled PDFs inside the application when the browser supports inline PDF viewing.
- Shows a document title supplied through the route query string.
- Offers direct file download.
- Provides a download fallback when inline preview is unavailable.
- Chapter resources and test papers use the same viewer.

## Progress and reporting

- Fully completed schedule days out of 30.
- Unique chapter quizzes attempted out of 50.
- Overall quiz average calculated from each attempted chapter's best score.
- Number of mock tests attempted, or average mock-test score when any marks have been entered.
- Per-subject schedule coverage with counts and progress bars.
- Per-subject quiz coverage, chapter totals, and average best score.
- Per-test score breakdown by paper and aggregate percentage.
- Links from subject performance rows back to the corresponding chapter list.
- Destructive reset action, protected by a browser confirmation, that clears all locally stored progress.

## Data and persistence

### Static shared content

- `src/data/mcqs.json`: subjects, chapters, questions, answers, and chapter PDF paths.
- `src/data/schedule.json`: the fixed dated 30-day plan.
- `src/data/tests.json`: four mock tests and their paper PDF paths.
- `public/pdfs/`: all bundled summaries, worksheets, answer keys, and mock-test documents.

All visitors receive the same curriculum, schedule, questions, answers, and documents in the frontend bundle.

### Learner activity stored on the device

All progress is held in one `localStorage` namespace, `daksh_portal_v1`, with these logical records:

| Record | Current shape | Purpose |
| --- | --- | --- |
| `quizScores` | `{ [chapterId]: { best, last, attempts[] } }` | Quiz history and best/last performance |
| `scheduleDone` | `{ [day]: { primary, secondary } }` | Completion of each daily study slot |
| `testsAttempted` | `{ [testNumber]: { attempted, scores } }` | Test status and marks by paper |
| `studiedChapters` | `{ [chapterId]: true }` | Defined by the data layer but not used by the current UI |

Consequences of the current design:

- There is effectively one anonymous learner record per browser profile.
- Progress does not follow the learner across devices or browsers.
- Clearing browser storage permanently loses progress.
- Multiple people using the same browser share and overwrite the same progress.
- There is no server backup, audit history, ownership check, reporting API, or data export/import.
- Static answers and answer-key PDFs are downloadable by every visitor who can load the site.

## Current routes

| Route | Screen |
| --- | --- |
| `/` | Home dashboard |
| `/schedule` | 30-day schedule |
| `/chapters` | Subject browser |
| `/chapters/:subject` | Chapters for one subject section |
| `/chapter/:subject/:chapterId` | Chapter details and resources |
| `/quiz/:subject/:chapterId` | Quiz intro, attempt, results, and review |
| `/tests` | Mock tests and marks |
| `/pdf/*` | Shared PDF preview/download |
| `/progress` | Progress dashboard and reset |

## Technology and deployment

- React 18 with React Router 6.
- Vite build and development tooling.
- Tailwind CSS plus custom component styles.
- Static deployment configuration for Vercel with SPA route rewriting.
- No API client, server code, database library, test framework, lint script, or automated test suite is currently configured.

## Multi-user conversion: required capability changes

The current feature set can remain the learner-facing foundation, but multi-user support requires user-scoped configuration and durable server-side data.

### Identity and security

- Replace the shared browser lock with real authentication and stable user IDs.
- Add sign-up/in, sign-out, session renewal, password recovery, and account/profile management as required by the product.
- Enforce authorization on the server; never rely on route hiding or browser checks.
- Decide supported roles and permissions, such as student, parent, teacher, and administrator.
- Add privacy controls, account deletion, and appropriate handling for student/minor data.

### User-scoped study configuration

- Remove hard-coded references to Daksh and derive names/avatar details from the signed-in profile.
- Replace the single globally dated schedule with a study-plan definition plus a per-user assignment/start date.
- Associate schedule completion, quiz attempts, and mock-test scores with a user (and, where applicable, a plan assignment).
- Decide whether all students share the same Class X CBSE content or can be assigned different boards, grades, subjects, curricula, and plans.
- Define time-zone behavior per user instead of relying only on the browser clock.

### Backend data model

At minimum, the server-side model will need equivalents of:

- users/profiles;
- roles and user-role relationships, if non-student roles are supported;
- curriculum/subjects/chapters/resources/question banks;
- study-plan templates, plan days/tasks, and user plan assignments;
- user schedule-task completions;
- quiz attempts and per-question responses;
- mock tests, papers, user attempts, and scores.

Every learner-owned table/record must carry or resolve to a user ID, with database-level access policies where supported.

### Data access and synchronization

- Replace direct `localStorage` reads/writes with authenticated API or backend SDK operations.
- Add loading, empty, failure, retry, and offline/reconnection states to the UI.
- Make writes safe against duplicate submissions and concurrent updates from multiple devices.
- Decide whether local storage remains as a cache/offline layer rather than the source of truth.
- Provide a one-time migration/import path if Daksh's existing browser progress must be preserved.

### Content and administration

- Decide whether curriculum content remains bundled and versioned in code or becomes backend-managed.
- Add administration workflows if staff need to manage students, plans, questions, PDFs, assignments, or scores without deployments.
- Protect premium/restricted content through server-authorized delivery if access control or monetization is planned; bundled frontend JSON and public PDFs cannot be securely paywalled.
- Add curriculum/content versioning so old attempts remain interpretable after questions or plans change.

### Reporting and operations

- Add per-student dashboards and, if required, parent/teacher cohort views.
- Define reporting rules consistently (for example, whether averages use best, latest, or all attempts).
- Add auditability for score edits, plan changes, and administrative actions.
- Add monitoring, backups, database migrations, automated tests, and environment/secrets management.

## Recommended migration order

1. Confirm roles, tenancy boundaries, shared versus assignable curriculum, and how schedules are created.
2. Establish authentication, user profiles, and authorization policies.
3. Design the server-side schema around user-owned plan assignments and attempt records.
4. Introduce a data-service boundary so screens no longer read browser storage directly.
5. Migrate schedule completion, quiz attempts, and test scores feature by feature.
6. Make all personalization and date handling user-specific.
7. Add administrative/content workflows and broader reporting only after student isolation is verified.
8. Remove or archive the duplicate `portal/` application so there is one canonical implementation.

## Repository observations

- The repository root is the apparent current implementation and is what `package.json` builds.
- `portal/` is a second, largely duplicated application with code differences, including a `CreateSchedule` screen that is not present in the root app. Maintaining both creates a high risk of implementing multi-user changes in the wrong copy.
- The root app currently contains 2,500 MCQs (50 stored questions per chapter) and 360 PDF files. Existing README/deployment text stating 1,250 MCQs and 160 PDFs is stale.
- The fixed schedule dates are already in the past relative to the repository review date (30 August 2026), so the current home screen will show the plan as complete to present-day users.
- The `studiedChapters` storage facility is unused and should either be given a defined product meaning or removed during the migration.
- The PDF viewer reads a `back` query parameter but does not render a dedicated back link from that value; navigation currently relies on the shared header's browser-history back button.
