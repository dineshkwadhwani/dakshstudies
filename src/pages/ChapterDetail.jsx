import { Link, useParams } from 'react-router-dom'
import { resourcePresentation, useChapter } from '../hooks/useCatalog.js'
import { compareChapterResources } from '../utils/resourceOrder.js'
import { useTopics } from '../hooks/useTopics.js'

const RESOURCE_COLORS = { summary: 'bg-sky/30', notes: 'bg-sky/30', worksheet: 'bg-leaf/25', worksheet_answer_key: 'bg-violet/25', source_pdf: 'bg-cream', other: 'bg-cream' }

export default function ChapterDetail() {
  const { subject: subjectSlug, chapterId } = useParams()
  const { data, loading, error, reload } = useChapter(subjectSlug, chapterId)
  if (loading) return <Status message="Loading chapter…" />
  if (error) return <Status message="We couldn't load this chapter." action={reload} />
  if (!data?.chapter) return <Status message="Chapter not found." />
  const { subject, chapter } = data
  const resources = (chapter.content_resources || []).filter(resource => resource.content_resource_versions?.length).sort(compareChapterResources)
  const summaries = resources.filter(resource => resource.resource_type === 'summary')
  const remainingResources = resources.filter(resource => resource.resource_type !== 'summary')

  return <div>
    <div className="card p-5 mb-4 relative overflow-hidden"><div className="absolute -top-12 -right-10 w-44 h-44 rounded-full opacity-30 blur-2xl" style={{ backgroundColor: subject.color }} /><div className="relative"><div className="flex items-center gap-2 mb-2"><div className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center text-xl" style={{ backgroundColor: subject.color || '#eee' }}>{subject.emoji || '📚'}</div><div><div className="text-[10px] font-mono uppercase tracking-widest text-ink/60">{subject.parent ? `${subject.parent.name} · ${subject.name}` : subject.name}</div><div className="text-xs text-ink/60">Chapter {chapter.chapter_number}</div></div></div><h1 className="heading-display text-2xl sm:text-3xl leading-tight">{chapter.title}</h1></div></div>
    {summaries.map(resource => <ResourceLink key={resource.id} resource={resource} subjectSlug={subject.slug} chapterKey={chapter.legacy_id || chapter.slug} />)}
    <ChapterTopics chapter={chapter} subjectSlug={subject.slug} />
    <Link to={`/quiz/${subject.slug}/${chapter.legacy_id || chapter.slug}`} className="card-pop block p-5 mb-3 bg-sun tappable"><div className="flex items-center gap-4"><div className="text-4xl animate-float">🎯</div><div className="flex-1"><div className="font-display font-extrabold text-xl">Take MCQ Quiz</div><div className="text-sm text-ink/70">25 questions · Practice or Test mode</div></div><span className="text-xl">›</span></div></Link>
    {remainingResources.map(resource => <ResourceLink key={resource.id} resource={resource} subjectSlug={subject.slug} chapterKey={chapter.legacy_id || chapter.slug} />)}
    {!resources.length && <div className="card p-5 text-center text-ink/70">Learning resources for this chapter are being prepared.</div>}
  </div>
}

function ChapterTopics({ chapter, subjectSlug }) {
  const { topics, loading, error, reload } = useTopics(chapter.id)
  if (loading) return <div className="card p-4 mb-4 text-ink/60">Loading topics…</div>
  if (error) return <div className="card p-4 mb-4"><p>Topics couldn't be loaded.</p><button className="font-bold underline mt-2" onClick={reload}>Try again</button></div>
  if (!topics.length) return null
  return <section className="mb-6" aria-labelledby="chapter-topics-title">
    <h2 id="chapter-topics-title" className="font-display font-extrabold text-xl mb-3">Topics in this chapter</h2>
    <ol className="space-y-2">{topics.map((topic, index) => <li key={topic.id}>
      <Link className="card-pop p-4 flex items-center gap-3 tappable" to={`/chapter/${subjectSlug}/${chapter.legacy_id || chapter.slug}/topic/${topic.slug}`}>
        <span className="w-9 h-9 shrink-0 rounded-lg border-2 border-ink bg-sky/20 grid place-items-center font-bold">{index + 1}</span>
        <span className="flex-1"><span className="block font-display font-bold">{topic.title}</span><span className="text-xs text-ink/60">Topic summary · {Math.ceil(topic.word_count / 180)} min read</span></span>
        <span aria-hidden="true">›</span>
      </Link>
    </li>)}</ol>
  </section>
}

function ResourceLink({ resource, subjectSlug, chapterKey }) {
  const latest = [...resource.content_resource_versions].sort((a, b) => b.version - a.version)[0]
  const display = resourcePresentation(resource)
  const params = new URLSearchParams({ version: latest.id, title: display.title, back: `/chapter/${subjectSlug}/${chapterKey}` })
  return <Link to={`/pdf?${params}`} className={`card-pop block p-4 mb-2 tappable ${RESOURCE_COLORS[resource.resource_type] || 'bg-cream'}`}><div className="flex items-center gap-3"><div className="text-2xl">{display.icon}</div><div className="flex-1 min-w-0"><div className="font-display font-bold">{display.title}</div><div className="text-xs text-ink/60">{display.subtitle}</div></div><span className="text-xl">›</span></div></Link>
}
function Status({ message, action }) { return <div className="card p-8 text-center"><p>{message}</p>{action && <button className="btn-secondary mt-4" onClick={action}>Try again</button>}</div> }
