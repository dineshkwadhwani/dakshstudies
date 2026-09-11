import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'
import { validateTopicSummary } from '../src/utils/topicHtml.js'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const selected = args.find(arg => arg.startsWith('--chapter='))?.slice('--chapter='.length)
const plan = JSON.parse(await readFile('content/topics/plan.json', 'utf8'))
const editorial = await readFile('content/topics/editorial-review.json', 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return {}; throw error })
const hash = text => createHash('sha256').update(text).digest('hex')
const prepared = []
const problems = []
const chapterPlans = plan.chapters.filter(chapter => !selected || chapter.chapter_legacy_id === selected)
if (!chapterPlans.length) throw new Error('No chapter matches the requested import.')
for (const chapter of chapterPlans) {
  const book = await readFile(join('portal/public/pdfs/books', chapter.source_file))
  if (hash(book) !== chapter.source_sha256) throw new Error(`Source textbook has changed: ${chapter.source_file}. Review its topics again.`)
  const directory = join('content/topics/summaries', chapter.chapter_legacy_id)
  const seen = new Set()
  for (const topic of chapter.topics) {
    const key = `${chapter.chapter_legacy_id}/${topic.slug}`
    try {
      if (seen.has(topic.slug)) throw new Error('Duplicate topic URL')
      seen.add(topic.slug)
      const html = await readFile(join(directory, `${topic.slug}.html`), 'utf8')
      validateTopicSummary(html)
      const digest = hash(html)
      const human = editorial[key]
      // Automated checks have missed incorrect worked examples. Publication
      // requires editorial approval of these exact bytes, not model approval.
      if (!(human?.approved && human.summary_sha256 === digest)) throw new Error('Summary requires editorial review of its current contents')
      const source = await readFile(join(directory, `${topic.slug}.source.json`), 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return topic; throw error })
      if (!source.source_section || !Number.isInteger(source.source_page_start) || !Number.isInteger(source.source_page_end)
        || source.source_page_start < 1 || source.source_page_end < source.source_page_start || source.source_page_end > chapter.source_page_count) throw new Error('Invalid source reference')
      prepared.push({ chapter_legacy_id: chapter.chapter_legacy_id, title: topic.title, slug: topic.slug, sort_order: topic.sort_order,
        summary_html: html, status: 'published', source_book: chapter.source_book, source_file: chapter.source_file,
        source_sha256: chapter.source_sha256, source_section: source.source_section,
        source_page_start: source.source_page_start, source_page_end: source.source_page_end })
    } catch (error) { problems.push(`${key}: ${error.message}`) }
  }
}
if (problems.length) {
  console.error(problems.join('\n'))
  throw new Error(`${problems.length} topics are not ready. Nothing was written to the database.`)
}
console.log(`Validated ${prepared.length} reviewed HTML summaries for ${chapterPlans.length} chapters.`)
if (args.includes('--validate-only')) process.exit(0)
const env = loadEnv('development', process.cwd(), '')
const db = createClient(env.SUPABASE_PROJECT_URL || env.VITE_SUPABASE_PROJECT_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: chapters, error: chapterError } = await db.from('chapters').select('id,legacy_id').in('legacy_id', chapterPlans.map(chapter => chapter.chapter_legacy_id))
if (chapterError) throw chapterError
if (chapters.length !== chapterPlans.length) throw new Error('A source chapter is missing from the database.')
const rows = prepared.map(({ chapter_legacy_id, ...row }) => ({ ...row, chapter_id: chapters.find(chapter => chapter.legacy_id === chapter_legacy_id).id }))
const { data: existing, error: existingError } = await db.from('chapter_topics').select('chapter_id,slug,summary_html,title,sort_order,status').in('chapter_id', chapters.map(chapter => chapter.id))
if (existingError) throw existingError
const inserts = []
for (const row of rows) {
  const previous = existing.find(item => item.chapter_id === row.chapter_id && item.slug === row.slug)
  if (!previous) inserts.push(row)
  else if (['summary_html', 'title', 'sort_order', 'status'].some(field => previous[field] !== row[field])) throw new Error(`Existing topic differs: ${row.slug}. Preserve the administrator's edit; use the topic editor for changes.`)
}
console.log(`${apply ? 'Applying' : 'Dry run:'} ${inserts.length} new topics; ${rows.length - inserts.length} already match.`)
if (apply && inserts.length) {
  // One insert is atomic: publication cannot leave a half-imported chapter.
  const { error } = await db.from('chapter_topics').insert(inserts)
  if (error) throw error
  const { count, error: verificationError } = await db.from('chapter_topics').select('id', { count: 'exact', head: true }).in('chapter_id', chapters.map(chapter => chapter.id)).eq('status', 'published')
  if (verificationError) throw verificationError
  console.log(`Import complete. ${count} published topics are present in the selected chapters.`)
}
