import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('student-facing code never creates storage signed URLs directly', async () => {
  const [catalog, pdfView, testsPage, chapterPage] = await Promise.all([
    read('src/hooks/useCatalog.js'), read('src/pages/PdfView.jsx'),
    read('src/pages/Tests.jsx'), read('src/pages/ChapterDetail.jsx'),
  ])
  const studentCode = `${catalog}\n${pdfView}\n${testsPage}\n${chapterPage}`
  assert.equal(studentCode.includes('.createSignedUrl('), false)
  assert.equal(studentCode.includes('storage_path'), false)
  assert.match(catalog, /\/api\/learning-resource-url/)
})

test('resource authorization enforces answer release, entitlement, and publication', async () => {
  const migration = await read('supabase/migrations/202609070004_secure_learning_resource_access.sql')
  assert.match(migration, /answer_key_policy = 'post_submission'/)
  assert.match(migration, /attempt\.status = 'submitted'/)
  assert.match(migration, /package_feature\.enabled/)
  assert.match(migration, /resource\.status = 'published'/)
  assert.match(migration, /Only SuperAdmin can directly read learning content files/)
})
