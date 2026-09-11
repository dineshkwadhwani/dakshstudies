// Read-only local progress report; approval is tied to the current HTML hash.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { validateTopicSummary } from '../src/utils/topicHtml.js'
const plan = JSON.parse(await readFile('content/topics/plan.json', 'utf8'))
const editorial = JSON.parse(await readFile('content/topics/editorial-review.json', 'utf8'))
let total = 0, written = 0, ready = 0
for (const chapter of plan.chapters) {
  let chapterWritten = 0, chapterReady = 0
  for (const topic of chapter.topics) {
    total++
    const key = `${chapter.chapter_legacy_id}/${topic.slug}`
    let html
    try { html = await readFile(`content/topics/summaries/${key}.html`, 'utf8') }
    catch (error) { if (error.code === 'ENOENT') continue; throw error }
    written++; chapterWritten++
    try { validateTopicSummary(html) } catch { continue }
    const review = editorial[key]
    if (review?.approved && review.summary_sha256 === createHash('sha256').update(html).digest('hex')) {
      ready++; chapterReady++
    }
  }
  console.log(`${chapter.chapter_legacy_id}: ${chapterWritten}/${chapter.topics.length} written, ${chapterReady} editorially approved`)
}
console.log(`Total: ${written}/${total} written; ${ready} editorially approved. Publication must be checked separately in the database.`)
