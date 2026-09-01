# Supabase Database Workflow

The database is defined exclusively by timestamped files in `migrations/`. Do not create production tables manually in Table Editor; doing so bypasses migration history.

## Local validation

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
```

Docker Desktop is required. Local reset is destructive only to the disposable local Supabase database.

## Hosted deployment

Copy the PostgreSQL connection string from **Supabase Dashboard → Connect** into `.env.local` as `SUPABASE_DB_URL`. Keep it server-only and URL-encode special characters in its password.

Preview pending changes:

```bash
set -a
source .env.local
set +a
npx supabase db push --db-url "$SUPABASE_DB_URL" --dry-run
```

Apply after reviewing the dry run:

```bash
npx supabase db push --db-url "$SUPABASE_DB_URL"
```

## Initial SuperAdmin

The Auth identity must be created in Supabase Auth first. Promote its corresponding `profiles` row to `super_admin` using a controlled initialization operation. Never place the SuperAdmin password or service-role key in a migration.

## Migration contents

- `202608310001_initial_schema.sql`: 41 application tables, enums, constraints, profile trigger, indexes.
- `202608310002_security_and_seed.sql`: RLS/grants, private Storage buckets, 2026–27 packages, features, and configuration defaults.
- `202609010001_content_import_constraints.sql`: stable natural key used by the idempotent content importer.

The migrations have been executed successfully against a disposable PostgreSQL 15 database with Supabase-compatible `auth` and `storage` stubs. Hosted deployment still requires a dry run because Supabase-managed schemas/extensions may differ by project configuration.

## Curriculum and asset import

Preview repository source counts without making changes:

```bash
npm run migrate:content
```

Import/update curriculum data and private PDF assets:

```bash
npm run migrate:content:apply
```

The importer uses legacy IDs, database uniqueness constraints, and Storage upserts so it can be rerun safely. It imports the Social Science hierarchy, 50 chapters, 2,500 versioned questions, 10,000 options, 50 chapter quiz definitions, four PDF mock tests, and all 360 bundled PDFs. It finishes with remote count assertions.
