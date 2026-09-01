import { Link } from 'react-router-dom'
import { useSubjects } from '../hooks/useCatalog.js'

export default function ChaptersIndex() {
  const { data: subjects, loading, error, reload } = useSubjects()
  if (loading) return <CatalogState icon="📚" message="Loading your subjects…" />
  if (error) return <CatalogState icon="⚠️" message="We couldn't load the subjects." action={reload} />
  const topLevel = subjects.filter(subject => !subject.parent_subject_id)

  return <div>
    <div className="mb-5"><div className="font-mono text-xs uppercase tracking-widest text-ink/60">Subjects</div><h1 className="heading-display text-3xl">Browse chapters</h1><p className="text-ink/70 mt-1">Chapter summaries, MCQ quizzes and worksheets from your active package.</p></div>
    {topLevel.map(subject => subject.children.length ? <div className="card p-4 mb-3" key={subject.id}>
      <SubjectHeading subject={subject} />
      <div className="grid grid-cols-2 gap-2 mt-3">{subject.children.map(child => <SubjectMiniCard key={child.id} subject={child} />)}</div>
    </div> : <SubjectCard key={subject.id} subject={subject} />)}
  </div>
}

function SubjectHeading({ subject }) { return <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl border-2 border-ink grid place-items-center text-2xl" style={{ backgroundColor: subject.color || '#eee' }}>{subject.emoji || '📚'}</div><div><h2 className="font-display font-extrabold text-xl">{subject.name}</h2><div className="text-xs text-ink/60">Choose a section</div></div></div> }
function SubjectCard({ subject }) { return <Link to={`/chapters/${subject.slug}`} className="card-pop block p-4 mb-3 tappable"><div className="flex items-center gap-3"><SubjectHeading subject={subject} /><div className="ml-auto text-xl">›</div></div></Link> }
function SubjectMiniCard({ subject }) { return <Link to={`/chapters/${subject.slug}`} className="block p-3 rounded-2xl border-2 border-ink bg-paper tappable hover:shadow-pop transition-shadow"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg border-2 border-ink grid place-items-center" style={{ backgroundColor: subject.color || '#eee' }}>{subject.emoji || '📘'}</div><div className="font-display font-bold text-sm">{subject.name}</div></div></Link> }
function CatalogState({ icon, message, action }) { return <div className="card p-8 text-center"><div className="text-4xl mb-3">{icon}</div><p>{message}</p>{action && <button className="btn-secondary mt-4" onClick={action}>Try again</button>}</div> }

