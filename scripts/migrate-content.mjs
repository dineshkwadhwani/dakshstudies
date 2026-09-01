import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = join(fileURLToPath(new URL('..', import.meta.url)))
const APPLY = process.argv.includes('--apply')
const BUCKET = 'learning-content'
const ACADEMIC_YEAR = '2026-27'

function loadEnv() {
  return readFile(join(root, '.env.local'), 'utf8').then(text => {
    const out = {}
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const at = line.indexOf('=')
      if (at < 1) continue
      const key = line.slice(0, at).trim()
      let value = line.slice(at + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      out[key] = value
    }
    return out
  })
}

function slugify(value) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function chunks(values, size = 250) {
  const result = []
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size))
  return result
}

async function must(label, promise) {
  const { data, error } = await promise
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

async function upsertOne(db, table, row, onConflict) {
  const data = await must(`upsert ${table}`, db.from(table).upsert(row, { onConflict }).select().single())
  return data
}

function inferResourceType(fileName) {
  if (/AnswerKey/i.test(fileName) || /Answer_Key/i.test(fileName)) return fileName.startsWith('Test') ? 'test_answer_key' : 'worksheet_answer_key'
  if (/Worksheet/i.test(fileName)) return 'worksheet'
  if (/QP/i.test(fileName)) return 'test_paper'
  if (/Study_Schedule/i.test(fileName)) return 'other'
  return 'summary'
}

function titleFromFile(fileName) {
  return fileName.replace(/\.pdf$/i, '').replaceAll('_', ' ')
}

function chapterPools(chapter) {
  const output = []
  const pools = [
    [chapter.questions || [], chapter.answers || [], 'A'],
    [chapter.questions2 || [], chapter.answers2 || [], 'B'],
  ]
  for (const [questions, answers, pool] of pools) {
    questions.forEach((question, index) => output.push({
      legacyId: `${chapter.id}:mcq:${pool}:${String(index + 1).padStart(2, '0')}`,
      prompt: question.q,
      options: question.opts,
      answer: answers[index],
      pool,
      position: output.length + 1,
    }))
  }
  return output
}

async function main() {
  const env = await loadEnv()
  const url = env.SUPABASE_PROJECT_URL || env.VITE_SUPABASE_PROJECT_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY are required')

  const mcqs = JSON.parse(await readFile(join(root, 'src/data/mcqs.json'), 'utf8'))
  const tests = JSON.parse(await readFile(join(root, 'src/data/tests.json'), 'utf8'))
  const pdfNames = (await readdir(join(root, 'public/pdfs'))).filter(name => name.toLowerCase().endsWith('.pdf')).sort()
  const subjectEntries = Object.entries(mcqs.subjects)
  const expectedChapters = subjectEntries.reduce((sum, [, subject]) => sum + subject.chapters.length, 0)
  const expectedQuestions = subjectEntries.reduce((sum, [, subject]) => sum + subject.chapters.reduce((n, ch) => n + chapterPools(ch).length, 0), 0)

  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', subjects: subjectEntries.length, chapters: expectedChapters, questions: expectedQuestions, pdfs: pdfNames.length, tests: tests.length }, null, 2))
  if (!APPLY) {
    console.log('Dry run complete. Use --apply to write content and upload files.')
    return
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const board = await must('load CBSE board', db.from('boards').select('id').eq('code', 'CBSE').single())
  const grade = await must('load Class 10', db.from('grades').select('id').eq('code', '10').single())
  const academicYear = await must('load academic year', db.from('academic_years').select('id').eq('code', ACADEMIC_YEAR).single())
  const curriculum = await upsertOne(db, 'curricula', {
    board_id: board.id,
    grade_id: grade.id,
    academic_year_id: academicYear.id,
    name: 'CBSE Class 10',
    version: 1,
    status: 'published',
  }, 'board_id,grade_id,academic_year_id,version')

  const socialParent = await upsertOne(db, 'subjects', {
    curriculum_id: curriculum.id,
    name: 'Social Science',
    slug: 'social-science',
    description: 'CBSE Class 10 Social Science',
    color: '#A06CD5',
    emoji: '🌐',
    sort_order: 3,
    status: 'published',
    legacy_id: 'social-science',
  }, 'legacy_id')

  const subjectIds = {}
  let subjectOrder = 0
  for (const [key, subject] of subjectEntries) {
    subjectOrder += 1
    const isSocial = ['geography', 'history', 'civics', 'economics'].includes(key)
    const row = await upsertOne(db, 'subjects', {
      curriculum_id: curriculum.id,
      parent_subject_id: isSocial ? socialParent.id : null,
      name: subject.name,
      slug: slugify(subject.name),
      description: subject.parent ? `${subject.parent} · ${subject.name}` : `CBSE Class 10 ${subject.name}`,
      color: subject.color,
      emoji: subject.emoji,
      sort_order: subjectOrder,
      status: 'published',
      legacy_id: key,
    }, 'legacy_id')
    subjectIds[key] = row.id
  }
  console.log(`Subjects imported: ${Object.keys(subjectIds).length} plus Social Science parent`)

  const chapterIds = {}
  for (const [subjectKey, subject] of subjectEntries) {
    for (const chapter of subject.chapters) {
      const row = await upsertOne(db, 'chapters', {
        subject_id: subjectIds[subjectKey],
        chapter_number: chapter.number,
        title: chapter.title,
        slug: slugify(chapter.title),
        sort_order: chapter.number,
        status: 'published',
        legacy_id: chapter.id,
      }, 'legacy_id')
      chapterIds[chapter.id] = row.id
    }
  }
  console.log(`Chapters imported: ${Object.keys(chapterIds).length}`)

  // Upload every bundled PDF and create a metadata/version row. Referenced and
  // legacy variants are retained so no source asset is lost during migration.
  const resourceIdsByFile = {}
  let uploaded = 0
  for (const fileName of pdfNames) {
    const filePath = join(root, 'public/pdfs', fileName)
    const buffer = await readFile(filePath)
    const storagePath = `cbse/class-10/${ACADEMIC_YEAR}/${fileName}`
    const matchingLegacyId = Object.keys(chapterIds).sort((a, b) => b.length - a.length).find(id => fileName.startsWith(id))
    const resource = await upsertOne(db, 'content_resources', {
      chapter_id: matchingLegacyId ? chapterIds[matchingLegacyId] : null,
      resource_type: inferResourceType(fileName),
      title: titleFromFile(fileName),
      description: 'Migrated from the original single-user study portal',
      status: 'published',
      current_version: 1,
      legacy_id: `pdf:${fileName}`,
    }, 'legacy_id')

    await must(`upload ${fileName}`, db.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    }))
    const checksum = createHash('sha256').update(buffer).digest('hex')
    await upsertOne(db, 'content_resource_versions', {
      resource_id: resource.id,
      version: 1,
      storage_path: storagePath,
      mime_type: 'application/pdf',
      size_bytes: buffer.length,
      checksum_sha256: checksum,
      provenance: { source: 'single_user_portal', original_path: `/pdfs/${fileName}` },
      published_at: new Date().toISOString(),
    }, 'resource_id,version')
    resourceIdsByFile[fileName] = resource.id
    uploaded += 1
    if (uploaded % 25 === 0 || uploaded === pdfNames.length) console.log(`PDFs uploaded: ${uploaded}/${pdfNames.length}`)
  }

  let importedQuestions = 0
  for (const [subjectKey, subject] of subjectEntries) {
    for (const chapter of subject.chapters) {
      const chapterId = chapterIds[chapter.id]
      const bank = await upsertOne(db, 'question_banks', {
        chapter_id: chapterId,
        subject_id: subjectIds[subjectKey],
        name: `${chapter.title} MCQ Bank`,
        bank_type: 'mcq',
        status: 'published',
      }, 'chapter_id,name')
      const pool = chapterPools(chapter)
      const questionRows = pool.map(item => ({ question_bank_id: bank.id, legacy_id: item.legacyId, current_version: 1, status: 'published' }))
      const questions = []
      for (const batch of chunks(questionRows)) questions.push(...await must('upsert questions', db.from('questions').upsert(batch, { onConflict: 'legacy_id' }).select('id,legacy_id')))
      const questionIdByLegacy = Object.fromEntries(questions.map(q => [q.legacy_id, q.id]))
      const versionRows = pool.map(item => ({
        question_id: questionIdByLegacy[item.legacyId],
        version: 1,
        prompt: item.prompt,
        difficulty: item.pool === 'B' ? 'hard' : 'medium',
        status: 'published',
        provenance: { source: 'mcqs.json', pool: item.pool },
        published_at: new Date().toISOString(),
      }))
      const versions = []
      for (const batch of chunks(versionRows)) versions.push(...await must('upsert question versions', db.from('question_versions').upsert(batch, { onConflict: 'question_id,version' }).select('id,question_id')))
      const versionByQuestion = Object.fromEntries(versions.map(v => [v.question_id, v.id]))
      const optionRows = []
      for (const item of pool) {
        const versionId = versionByQuestion[questionIdByLegacy[item.legacyId]]
        item.options.forEach((option, index) => optionRows.push({
          question_version_id: versionId,
          option_text: option,
          canonical_order: index,
          is_correct: String.fromCharCode(65 + index) === item.answer,
        }))
      }
      for (const batch of chunks(optionRows, 400)) await must('upsert question options', db.from('question_options').upsert(batch, { onConflict: 'question_version_id,canonical_order' }))

      const assessment = await upsertOne(db, 'assessments', {
        curriculum_id: curriculum.id,
        subject_id: subjectIds[subjectKey],
        chapter_id: chapterId,
        title: `${chapter.title} MCQ Quiz`,
        assessment_type: 'practice_quiz',
        maximum_marks: 25,
        duration_minutes: 25,
        answer_key_policy: 'always',
        status: 'published',
        legacy_id: `quiz:${chapter.id}`,
      }, 'legacy_id')
      const section = await upsertOne(db, 'assessment_sections', {
        assessment_id: assessment.id,
        subject_id: subjectIds[subjectKey],
        title: chapter.title,
        maximum_marks: 25,
        sort_order: 1,
      }, 'assessment_id,sort_order')
      const assessmentRows = pool.map((item, index) => ({
        assessment_section_id: section.id,
        question_version_id: versionByQuestion[questionIdByLegacy[item.legacyId]],
        sort_order: index + 1,
        marks: 1,
      }))
      for (const batch of chunks(assessmentRows)) await must('upsert assessment questions', db.from('assessment_questions').upsert(batch, { onConflict: 'assessment_section_id,sort_order' }))
      importedQuestions += pool.length
      console.log(`Question bank imported: ${chapter.title} (${importedQuestions}/${expectedQuestions})`)
    }
  }

  for (const test of tests) {
    const assessment = await upsertOne(db, 'assessments', {
      curriculum_id: curriculum.id,
      title: test.name || `Test ${test.number}`,
      assessment_type: 'pdf_mock_test',
      maximum_marks: test.papers.length * 80,
      answer_key_policy: 'post_submission',
      status: 'published',
      legacy_id: `test:${test.number}`,
    }, 'legacy_id')
    for (let index = 0; index < test.papers.length; index += 1) {
      const paper = test.papers[index]
      const subjectId = paper.subject === 'Maths' ? subjectIds.maths : paper.subject === 'Science' ? subjectIds.science : socialParent.id
      const section = await upsertOne(db, 'assessment_sections', {
        assessment_id: assessment.id,
        subject_id: subjectId,
        title: paper.subject,
        maximum_marks: 80,
        sort_order: index + 1,
      }, 'assessment_id,sort_order')
      for (const [purpose, sourcePath] of [['question_paper', paper.qp], ['answer_key', paper.key]]) {
        const fileName = basename(sourcePath)
        const resourceId = resourceIdsByFile[fileName]
        if (!resourceId) throw new Error(`Missing migrated PDF resource: ${fileName}`)
        await upsertOne(db, 'assessment_resources', {
          assessment_id: assessment.id,
          assessment_section_id: section.id,
          resource_id: resourceId,
          purpose,
        }, 'assessment_id,assessment_section_id,purpose')
      }
    }
  }
  console.log(`Mock tests imported: ${tests.length}`)

  const counts = {}
  for (const table of ['subjects','chapters','content_resources','content_resource_versions','question_banks','questions','question_versions','question_options','assessments','assessment_sections','assessment_questions','assessment_resources']) {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true })
    if (error) throw new Error(`count ${table}: ${error.message}`)
    counts[table] = count
  }
  console.log('Remote content counts:')
  console.log(JSON.stringify(counts, null, 2))

  if (counts.chapters !== expectedChapters) throw new Error(`Expected ${expectedChapters} chapters, found ${counts.chapters}`)
  if (counts.questions !== expectedQuestions) throw new Error(`Expected ${expectedQuestions} questions, found ${counts.questions}`)
  if (counts.content_resource_versions !== pdfNames.length) throw new Error(`Expected ${pdfNames.length} resource versions, found ${counts.content_resource_versions}`)
  console.log('Content migration completed and verified.')
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})

