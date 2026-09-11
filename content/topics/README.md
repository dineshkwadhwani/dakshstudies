# Chapter topics

Topics appear on chapter pages alongside the existing quiz and document cards. Each topic opens an HTML reader with previous/next navigation. Superadministrators can create, arrange, edit, publish or archive summaries at `/admin/topics`, linked from the content library.

The migration `supabase/migrations/202609070009_chapter_topics.sql` adds `chapter_topics`, generated word counts, publication constraints and entitlement-aware row security. Published summaries contain 300–500 words. The renderer accepts only attribute-free paragraphs, headings, lists, emphasis, subscript and superscript; stored HTML is parsed into React elements rather than injected into the DOM. Use Unicode mathematical symbols and HTML `sub`/`sup`, not LaTeX.

## Sources and coverage

`plan.json` contains the ordered topic inventory and source-book hashes. The supplied 2026–27 textbooks cover 49 chapters and the plan contains 256 topics. The portal's Constructions chapter is absent from the supplied mathematics textbook and is explicitly listed as unavailable. It must not receive invented textbook coverage.

The source PDFs are in `portal/public/pdfs/books/`. Regenerate local text excerpts with:

```sh
node scripts/extract-topic-sources.mjs
```

Extracted text goes to `/tmp/daksh-topic-sources/`; it is not bundled into the student app. Source page references are one-based PDF pages, not printed page numbers.

## Drafting and editorial review

Each `summaries/<chapter legacy id>/<topic slug>.html` file is a source-controlled summary. Companion `.source.json` files identify the source sections and pages. `review.json` contains automated review feedback, which is advisory: automated checks have missed incorrect examples and have also rejected valid textbook terminology. Review the source and independently check worked examples.

`editorial-review.json` records approval tied to the SHA-256 of the exact HTML. Editing a file invalidates its previous approval. Do not update an approval hash without actually reviewing the revised text. Some saved summaries are still drafts; the presence of an HTML file or an automated approval does not mean it has been published.

The optional drafting tool sends selected textbook excerpts to the configured Groq service, consumes its quota, and requires `GROQ_KEY`:

```sh
node scripts/draft-topic-summaries.mjs --generate
node scripts/draft-topic-summaries.mjs --generate --chapter=Maths_Ch07_CoordinateGeometry
```

It resumes missing files and never publishes. Existing HTML is preserved. `.pending.json` files are failed candidates retained for repair, not publishable content. To rerun automated review, use `--review-only --force-review` with `--generate`.

## Publishing

Validate a completed chapter locally, inspect the database dry run, then apply:

```sh
node scripts/import-topics.mjs --validate-only --chapter=Maths_Ch07_CoordinateGeometry
node scripts/import-topics.mjs --chapter=Maths_Ch07_CoordinateGeometry
node scripts/import-topics.mjs --apply --chapter=Maths_Ch07_CoordinateGeometry
```

The importer checks source hashes, HTML, word counts, source references and editorial approval before any write. A chapter is inserted atomically. Existing differing content is rejected to preserve administrator edits; update published topics through the editor. Omitting `--chapter` requires every planned topic to be ready.

The database migration and incremental content imports have been applied, but frontend changes still need the normal application deployment. Check the database for actual publication status rather than inferring it from local files.

## Verification

```sh
npm run test:topics
npm run test:security
npm run build
```

The topic tests run the migration in PostgreSQL-compatible PGlite and check entitlements, inactive accounts, expired access, role restrictions, word limits and HTML validation. Student reader and administrator editing flows have also been exercised in a local mobile browser with mocked authentication/data.
