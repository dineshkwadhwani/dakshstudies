import { Link, useParams } from 'react-router-dom'
import { useSubjectChapters } from '../hooks/useCatalog.js'

export default function SubjectChapters() {
  const { subject: subjectSlug } = useParams()
  const { data: subject, loading, error, reload } = useSubjectChapters(subjectSlug)
  if (loading) return <Status message="Loading chapters…" />
  if (error) return <Status message="We couldn't load these chapters." action={reload} />
  if (!subject) return <Status message="Subject not found." />

  return <div>
    <div className="flex items-center gap-3 mb-4"><div className="w-14 h-14 rounded-2xl border-2 border-ink grid place-items-center text-3xl" style={{ backgroundColor: subject.color || '#eee' }}>{subject.emoji || '📚'}</div><div><div className="font-mono text-xs uppercase tracking-widest text-ink/60">{subject.parent?.name || 'Subject'}</div><h1 className="heading-display text-2xl">{subject.name}</h1><div className="text-xs text-ink/60">{subject.chapters.length} chapters</div></div></div>
    <div className="space-y-2">{subject.chapters.map(chapter => {
      const resourceTypes = new Set(chapter.content_resources?.map(resource => resource.resource_type))
      return <Link key={chapter.id} to={`/chapter/${subject.slug}/${chapter.legacy_id || chapter.slug}`} className="card-pop tappable block p-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl border-2 border-ink bg-cream grid place-items-center font-display font-extrabold">{chapter.chapter_number}</div><div className="flex-1 min-w-0"><div className="font-display font-bold text-base leading-tight">{chapter.title}</div><div className="flex gap-2 mt-1 flex-wrap">{resourceTypes.has('summary') && <span className="chip text-[10px] py-0.5 px-2 bg-sky/30">📄 Summary</span>}<span className="chip text-[10px] py-0.5 px-2 bg-sun/30">🎯 MCQs</span>{resourceTypes.has('worksheet') && <span className="chip text-[10px] py-0.5 px-2 bg-leaf/30">📝 Worksheets</span>}</div></div><span className="text-xl">›</span></div></Link>
    })}</div>
  </div>
}
function Status({ message, action }) { return <div className="card p-8 text-center"><p>{message}</p>{action && <button className="btn-secondary mt-4" onClick={action}>Try again</button>}</div> }

