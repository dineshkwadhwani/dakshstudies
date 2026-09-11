import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useChapter } from '../hooks/useCatalog.js'
import { useTopics } from '../hooks/useTopics.js'
import TopicSummary from '../components/TopicSummary.jsx'

export default function TopicDetail() {
  const { subject: subjectSlug, chapterId, topicSlug } = useParams()
  const chapterState = useChapter(subjectSlug, chapterId)
  const chapter = chapterState.data?.chapter
  const { topics, topic, loading, error, reload } = useTopics(chapter?.id, topicSlug)
  useEffect(() => { window.scrollTo({ top: 0 }) }, [topicSlug])
  const back = `/chapter/${subjectSlug}/${chapterId}`
  if (chapterState.loading || loading) return <div className="card p-8 text-center">Loading topic…</div>
  if (chapterState.error || error) return <div className="card p-8 text-center"><p>We couldn't load this topic.</p><button className="btn-secondary mt-4" onClick={() => { chapterState.reload(); reload() }}>Try again</button></div>
  if (!chapter || !topic) return <div className="card p-8 text-center"><p>This topic is unavailable. Check that your package includes learning content.</p><Link to={back} className="btn-secondary inline-flex mt-4">Back to chapter</Link></div>
  const index = topics.findIndex(item => item.id === topic.id)
  const previous = topics[index - 1]
  const next = topics[index + 1]
  return <article>
    <Link to={back} className="inline-flex text-sm font-bold mb-4">← {chapter.title}</Link>
    <header className="card p-5 sm:p-7 mb-4 bg-sky/20">
      <p className="font-mono text-xs uppercase tracking-widest text-ink/60">{chapterState.data.subject.name} · Topic {index + 1} of {topics.length}</p>
      <h1 className="heading-display text-2xl sm:text-3xl mt-2">{topic.title}</h1>
      <p className="text-sm text-ink/60 mt-2">{Math.ceil(topic.word_count / 180)} min read</p>
    </header>
    <section className="card p-5 sm:p-8"><TopicSummary html={topic.summary_html} /></section>
    {topic.source_book && <p className="text-xs text-ink/60 mt-4">Based on {topic.source_book}{topic.source_section ? ` · ${topic.source_section}` : ''}.</p>}
    <nav aria-label="Topic navigation" className="grid sm:grid-cols-2 gap-3 mt-6">
      {previous ? <Link className="btn-secondary text-left" to={`${back}/topic/${previous.slug}`}>← {previous.title}</Link> : <Link className="btn-secondary" to={back}>All topics</Link>}
      {next ? <Link className="btn-primary text-left" to={`${back}/topic/${next.slug}`}>{next.title} →</Link> : <Link className="btn-primary" to={`/quiz/${subjectSlug}/${chapterId}`}>Take chapter MCQ quiz →</Link>}
    </nav>
  </article>
}
