import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { mcqs, saveCustomSchedule, buildScheduleEntries } from '../hooks/useData.js'
import { todayISO, parseISO } from '../utils/dates.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function addDays(iso, n) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function subjectColor(key) {
  return mcqs.subjects[key]?.color || '#ddd'
}
function subjectEmoji(key) {
  return mcqs.subjects[key]?.emoji || '📖'
}
function subjectName(key) {
  const s = mcqs.subjects[key]
  return s?.parent ? `${s.parent} · ${s.name}` : s?.name || key
}

const SS_KEYS = ['geography', 'history', 'civics', 'economics']

// ─── main component ──────────────────────────────────────────────────────────

export default function CreateSchedule() {
  const navigate = useNavigate()
  const today = todayISO()

  // ── dates ──
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(addDays(today, 29))

  // ── chapter selections ──
  const allMaths = mcqs.subjects.maths.chapters
  const allSci   = mcqs.subjects.science.chapters
  const allSS    = SS_KEYS.flatMap(k => (mcqs.subjects[k]?.chapters || []).map(ch => ({ ...ch, subjectKey: k })))

  const [mathsSel, setMathsSel] = useState(() => new Set(allMaths.map(c => c.id)))
  const [sciSel,   setSciSel]   = useState(() => new Set(allSci.map(c => c.id)))
  const [ssSel,    setSsSel]    = useState(() => new Set(allSS.map(c => c.id)))

  // ── pace ──
  const [mathsPerDay, setMathsPerDay] = useState(1)
  const [sciPerDay,   setSciPerDay]   = useState(1)
  const [ssPerDay,    setSsPerDay]    = useState(1)

  // ── tests ──
  const [includeTests, setIncludeTests] = useState(true)
  const [testFreq, setTestFreq] = useState('fortnightly')

  // ── section expand state ──
  const [open, setOpen] = useState({ maths: true, science: false, ss: false })
  const toggle = key => setOpen(o => ({ ...o, [key]: !o[key] }))

  // ── preview ──
  const preview = useMemo(() => {
    try {
      const entries = buildScheduleEntries({
        startDate, endDate,
        mathsIds: [...mathsSel],
        sciIds: [...sciSel],
        ssIds: [...ssSel],
        mathsPerDay, sciPerDay, ssPerDay,
        includeTests, testFreq,
      })
      return { entries, error: null }
    } catch (e) {
      return { entries: [], error: e.message }
    }
  }, [startDate, endDate, mathsSel, sciSel, ssSel, mathsPerDay, sciPerDay, ssPerDay, includeTests, testFreq])

  function handleCreate() {
    if (preview.entries.length === 0) return
    if (!confirm(`Create a new ${preview.entries.length}-day schedule? This will reset your current schedule progress.`)) return
    saveCustomSchedule(preview.entries)
    navigate('/schedule')
  }

  // ── toggle all helpers ──
  function toggleAll(sel, setSel, all) {
    if (sel.size === all.length) setSel(new Set())
    else setSel(new Set(all.map(c => c.id)))
  }
  function toggleOne(id, sel, setSel) {
    const next = new Set(sel)
    next.has(id) ? next.delete(id) : next.add(id)
    setSel(next)
  }

  const chapterCount = mathsSel.size + sciSel.size + ssSel.size

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="mb-5">
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60">Study plan</div>
        <h1 className="heading-display text-3xl">Create Schedule</h1>
        <p className="text-ink/70 mt-1 text-sm">
          Pick your chapters, pace and dates — we'll build the schedule automatically.
        </p>
      </div>

      {/* ── Dates ── */}
      <Section title="📅 Study period" color="bg-sky/20">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-ink/60 block mb-1">Start date</span>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-ink bg-paper font-mono text-sm focus:outline-none focus:shadow-pop"
            />
          </label>
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-ink/60 block mb-1">End date</span>
            <input
              type="date"
              value={endDate}
              min={addDays(startDate, 1)}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-ink bg-paper font-mono text-sm focus:outline-none focus:shadow-pop"
            />
          </label>
        </div>
        <p className="text-xs text-ink/60 mt-2">
          {Math.max(0, Math.round((parseISO(endDate) - parseISO(startDate)) / 86400000) + 1)} calendar days
        </p>
      </Section>

      {/* ── Maths chapters ── */}
      <ChapterSection
        title="🧮 Mathematics"
        color="bg-flame/15"
        chapters={allMaths}
        selected={mathsSel}
        onToggleAll={() => toggleAll(mathsSel, setMathsSel, allMaths)}
        onToggleOne={id => toggleOne(id, mathsSel, setMathsSel)}
        open={open.maths}
        onToggleOpen={() => toggle('maths')}
        subjectKey="maths"
        perDay={mathsPerDay}
        onPerDayChange={setMathsPerDay}
        paceLabel="Maths chapters per day"
      />

      {/* ── Science chapters ── */}
      <ChapterSection
        title="🔬 Science"
        color="bg-leaf/15"
        chapters={allSci}
        selected={sciSel}
        onToggleAll={() => toggleAll(sciSel, setSciSel, allSci)}
        onToggleOne={id => toggleOne(id, sciSel, setSciSel)}
        open={open.science}
        onToggleOpen={() => toggle('science')}
        subjectKey="science"
        perDay={sciPerDay}
        onPerDayChange={setSciPerDay}
        paceLabel="Science chapters per day"
      />

      {/* ── Social Science chapters ── */}
      <SsChapterSection
        allSS={allSS}
        selected={ssSel}
        onToggleAll={() => toggleAll(ssSel, setSsSel, allSS)}
        onToggleOne={id => toggleOne(id, ssSel, setSsSel)}
        open={open.ss}
        onToggleOpen={() => toggle('ss')}
        perDay={ssPerDay}
        onPerDayChange={setSsPerDay}
      />

      {/* ── Tests ── */}
      <Section title="📝 Practice tests" color="bg-flame/10">
        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <Checkbox checked={includeTests} onChange={() => setIncludeTests(v => !v)} />
          <span className="font-bold">Add practice tests to schedule</span>
        </label>

        {includeTests && (
          <div>
            <p className="text-xs text-ink/60 mb-2">Insert a mock test every:</p>
            <div className="flex gap-2">
              {['weekly', 'fortnightly', 'monthly'].map(f => (
                <button
                  key={f}
                  onClick={() => setTestFreq(f)}
                  className={`flex-1 py-2 px-1 rounded-xl border-2 border-ink text-sm font-bold transition-all capitalize ${testFreq === f ? 'bg-sun shadow-pop' : 'bg-paper'}`}
                >
                  {f === 'fortnightly' ? 'Fortnightly' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── Preview ── */}
      <Section title="👀 Preview" color="bg-violet/15">
        {preview.error ? (
          <p className="text-flame font-bold">{preview.error}</p>
        ) : preview.entries.length === 0 ? (
          <p className="text-ink/60 text-sm">Select at least one chapter to see preview.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <PreviewStat label="Total days" value={preview.entries.length} color="bg-sky/20" />
              <PreviewStat label="Chapters" value={chapterCount} color="bg-sun/30" />
              <PreviewStat label="Tests" value={preview.entries.filter(e => e.secondary?.type === 'test').length} color="bg-flame/20" />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-ink bg-paper divide-y-2 divide-ink/10">
              {preview.entries.slice(0, 60).map((e, i) => (
                <div key={i} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                  <span className="font-mono text-ink/50 w-8 shrink-0">D{e.day}</span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0 border border-ink/30"
                    style={{ backgroundColor: subjectColor(e.primary.subject) }}
                  />
                  <span className="truncate font-bold">{e.primary.title}</span>
                  {e.secondary && (
                    <>
                      <span className="text-ink/30">·</span>
                      {e.secondary.type === 'test' ? (
                        <span className="text-flame font-bold shrink-0">📝 Test {e.secondary.testNumber}</span>
                      ) : (
                        <>
                          <span
                            className="w-2 h-2 rounded-full shrink-0 border border-ink/30"
                            style={{ backgroundColor: subjectColor(e.secondary.subject) }}
                          />
                          <span className="truncate text-ink/70">{e.secondary.title}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
              {preview.entries.length > 60 && (
                <div className="px-3 py-2 text-xs text-ink/50 text-center">
                  + {preview.entries.length - 60} more days…
                </div>
              )}
            </div>
          </>
        )}
      </Section>

      {/* ── Create button ── */}
      <div className="fixed bottom-[68px] left-0 right-0 px-4 py-3 bg-cream/95 backdrop-blur border-t-2 border-ink z-30">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleCreate}
            disabled={preview.entries.length === 0}
            className="btn-primary w-full text-base disabled:opacity-40 disabled:pointer-events-none"
          >
            Create schedule ({preview.entries.length} days) →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Section({ title, color, children }) {
  return (
    <div className={`card p-4 mb-3 ${color}`}>
      <h2 className="font-display font-extrabold text-base mb-3">{title}</h2>
      {children}
    </div>
  )
}

function ChapterSection({ title, color, chapters, selected, onToggleAll, onToggleOne, open, onToggleOpen, subjectKey, perDay, onPerDayChange, paceLabel }) {
  const allSelected = selected.size === chapters.length
  const someSelected = selected.size > 0 && !allSelected
  return (
    <div className={`card mb-3 overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={onToggleOpen}
        className={`w-full flex items-center gap-3 p-4 text-left tappable ${color}`}
      >
        <div
          className="w-9 h-9 rounded-xl border-2 border-ink grid place-items-center text-lg shrink-0"
          style={{ backgroundColor: mcqs.subjects[subjectKey]?.color }}
        >
          {mcqs.subjects[subjectKey]?.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-extrabold">{title}</div>
          <div className="text-xs text-ink/60">{selected.size} of {chapters.length} selected</div>
        </div>
        <span className="text-ink/40 text-lg">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-4 border-t-2 border-ink/10">
          {/* Pace selector */}
          <div className="mb-3">
            <p className="text-xs font-mono uppercase tracking-wider text-ink/60 mb-1">{paceLabel}</p>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => onPerDayChange(n)}
                  className={`w-12 py-1.5 rounded-xl border-2 border-ink text-sm font-bold transition-all ${perDay === n ? 'bg-sun shadow-pop' : 'bg-paper'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Select all */}
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={onToggleAll}
            />
            <span className="text-sm font-bold">{allSelected ? 'Deselect all' : 'Select all'}</span>
          </label>

          {/* Chapter list */}
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {chapters.map(ch => (
              <label key={ch.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-cream rounded-lg px-1">
                <Checkbox
                  checked={selected.has(ch.id)}
                  onChange={() => onToggleOne(ch.id)}
                />
                <span className="text-sm leading-tight">{ch.number ? `Ch ${ch.number}: ` : ''}{ch.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SsChapterSection({ allSS, selected, onToggleAll, onToggleOne, open, onToggleOpen, perDay, onPerDayChange }) {
  const allSelected = selected.size === allSS.length
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="card mb-3 overflow-hidden">
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center gap-3 p-4 text-left tappable bg-violet/15"
      >
        <div className="w-9 h-9 rounded-xl border-2 border-ink grid place-items-center text-lg bg-violet/40 shrink-0">
          🌐
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-extrabold">🌐 Social Science</div>
          <div className="text-xs text-ink/60">{selected.size} of {allSS.length} selected</div>
        </div>
        <span className="text-ink/40 text-lg">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-4 border-t-2 border-ink/10">
          {/* Pace selector */}
          <div className="mb-3">
            <p className="text-xs font-mono uppercase tracking-wider text-ink/60 mb-1">SS chapters per day</p>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => onPerDayChange(n)}
                  className={`w-12 py-1.5 rounded-xl border-2 border-ink text-sm font-bold transition-all ${perDay === n ? 'bg-sun shadow-pop' : 'bg-paper'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Select all */}
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <Checkbox checked={allSelected} indeterminate={someSelected} onChange={onToggleAll} />
            <span className="text-sm font-bold">{allSelected ? 'Deselect all' : 'Select all'}</span>
          </label>

          {/* Grouped by sub-subject */}
          {SS_KEYS.map(sk => {
            const sub = mcqs.subjects[sk]
            if (!sub) return null
            const chapters = allSS.filter(c => c.subjectKey === sk)
            return (
              <div key={sk} className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-5 h-5 rounded border border-ink grid place-items-center text-xs"
                    style={{ backgroundColor: sub.color }}
                  >{sub.emoji}</div>
                  <span className="text-xs font-bold uppercase tracking-wider text-ink/60">{sub.name}</span>
                </div>
                <div className="space-y-0.5 pl-2 max-h-44 overflow-y-auto pr-1">
                  {chapters.map(ch => (
                    <label key={ch.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-cream rounded-lg px-1">
                      <Checkbox
                        checked={selected.has(ch.id)}
                        onChange={() => onToggleOne(ch.id)}
                      />
                      <span className="text-sm leading-tight">{ch.number ? `Ch ${ch.number}: ` : ''}{ch.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Checkbox({ checked, indeterminate, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-6 h-6 shrink-0 rounded-lg border-2 border-ink grid place-items-center transition-all tappable ${checked ? 'bg-sun shadow-[2px_2px_0_0_#0F0E17]' : indeterminate ? 'bg-sun/50' : 'bg-paper hover:bg-cream'}`}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
      {indeterminate && !checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      )}
    </button>
  )
}

function PreviewStat({ label, value, color }) {
  return (
    <div className={`rounded-xl border-2 border-ink p-2 text-center ${color}`}>
      <div className="font-display font-extrabold text-xl">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-ink/60">{label}</div>
    </div>
  )
}
