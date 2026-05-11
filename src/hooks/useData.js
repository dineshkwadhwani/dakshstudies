import mcqs from '../data/mcqs.json'
import schedule from '../data/schedule.json'
import tests from '../data/tests.json'
import { getStored, setStored, useStoredReactive } from './useStorage.js'

export { mcqs, schedule, tests }

export function getSubject(key) {
  return mcqs.subjects[key]
}

export function getAllSubjectKeys() {
  return Object.keys(mcqs.subjects)
}

export function getChapter(subjectKey, chapterId) {
  const sub = mcqs.subjects[subjectKey]
  if (!sub) return null
  return sub.chapters.find(c => c.id === chapterId) || null
}

/**
 * Find a chapter by its id alone (without knowing subject).
 */
export function findChapterById(chapterId) {
  for (const [key, sub] of Object.entries(mcqs.subjects)) {
    const ch = sub.chapters.find(c => c.id === chapterId)
    if (ch) return { subjectKey: key, subject: sub, chapter: ch }
  }
  return null
}

/* ===== Storage keys ===== */
const QUIZ_KEY = 'quizScores'         // { [chapterId]: { best, last, attempts: [...] } }
const STUDY_KEY = 'studiedChapters'   // { [chapterId]: true }
const SCHEDULE_KEY = 'scheduleDone'   // { [day]: { primary: bool, secondary: bool } }  (NEW shape)
const TEST_KEY = 'testsAttempted'     // { [testNumber]: { attempted: bool, scores: {Maths,Science,Social Science} } }
const AUTO_TICK_THRESHOLD = 60        // %  — quiz score needed to auto-tick chapter as done

/* ===== Migration: old shape -> new shape ===== */
function migrateScheduleData(raw) {
  // Old: { "5": true }   New: { "5": { primary: true, secondary: true } }
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [day, val] of Object.entries(raw)) {
    if (val && typeof val === 'object' && ('primary' in val || 'secondary' in val)) {
      out[day] = { primary: !!val.primary, secondary: !!val.secondary }
    } else {
      // legacy boolean: assume both done
      out[day] = { primary: !!val, secondary: !!val }
    }
  }
  return out
}

function migrateTestsData(raw) {
  // Old: { "1": true }   New: { "1": { attempted: true, scores: {...} } }
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [num, val] of Object.entries(raw)) {
    if (val && typeof val === 'object' && 'attempted' in val) {
      out[num] = val
    } else {
      out[num] = { attempted: !!val, scores: {} }
    }
  }
  return out
}

/* ===== Quiz attempts ===== */

export function recordQuizAttempt(chapterId, attempt) {
  const all = getStored(QUIZ_KEY, {})
  const cur = all[chapterId] || { attempts: [], best: 0 }
  cur.attempts = [attempt, ...cur.attempts].slice(0, 10)
  cur.last = attempt
  cur.best = Math.max(cur.best || 0, attempt.percent)
  all[chapterId] = cur
  setStored(QUIZ_KEY, all)

  // Bonus: auto-tick the matching chapter in the schedule
  if (attempt.percent >= AUTO_TICK_THRESHOLD) {
    autoTickSchedule(chapterId)
  }

  return cur
}

function autoTickSchedule(chapterId) {
  // Find every schedule day that references this chapter (could appear in primary OR secondary)
  const raw = migrateScheduleData(getStored(SCHEDULE_KEY, {}))
  let changed = false
  for (const entry of schedule) {
    const updates = { ...raw[entry.day] } || {}
    let touched = false

    if (entry.primary?.id === chapterId && !updates.primary) {
      updates.primary = true
      touched = true
    }
    if (entry.secondary?.type === 'chapter' && entry.secondary?.id === chapterId && !updates.secondary) {
      updates.secondary = true
      touched = true
    }

    if (touched) {
      raw[entry.day] = { primary: !!updates.primary, secondary: !!updates.secondary }
      changed = true
    }
  }
  if (changed) setStored(SCHEDULE_KEY, raw)
}

export function useQuizScores() {
  const [scores] = useStoredReactive(QUIZ_KEY, {})
  return scores
}

export function useStudiedChapters() {
  return useStoredReactive(STUDY_KEY, {})
}

/* ===== Schedule (per-slot) ===== */

export function useScheduleDone() {
  const [raw, setRaw] = useStoredReactive(SCHEDULE_KEY, {})
  const migrated = migrateScheduleData(raw)
  return [migrated, setRaw]
}

/**
 * Toggle a single slot (primary/secondary) for a given day.
 */
export function toggleScheduleSlot(day, slot) {
  // slot: 'primary' | 'secondary'
  const raw = migrateScheduleData(getStored(SCHEDULE_KEY, {}))
  const cur = raw[day] || { primary: false, secondary: false }
  cur[slot] = !cur[slot]
  raw[day] = cur
  setStored(SCHEDULE_KEY, raw)
}

/**
 * A day is "complete" only when both slots are done (or, if secondary is a test, only primary matters here —
 * test attendance is tracked separately).
 */
export function isDayComplete(doneMap, entry) {
  const d = doneMap[entry.day]
  if (!d) return false
  if (entry.secondary?.type === 'test') {
    // For test days, only Maths matters for "day complete" purposes.
    return !!d.primary
  }
  return !!d.primary && !!d.secondary
}

/**
 * Count slots done across all 30 days. Returns {primaryDone, secondaryDone, daysFullyDone, totalDays}.
 */
export function getScheduleSummary(doneMap) {
  let primaryDone = 0, secondaryDone = 0, daysFullyDone = 0
  for (const entry of schedule) {
    const d = doneMap[entry.day] || {}
    if (d.primary) primaryDone++
    if (d.secondary || entry.secondary?.type === 'test') {
      // Treat test days' secondary as "n/a" so they don't penalise the count
      if (d.secondary) secondaryDone++
    }
    if (isDayComplete(doneMap, entry)) daysFullyDone++
  }
  return {
    primaryDone, secondaryDone, daysFullyDone,
    totalDays: schedule.length,
  }
}

/**
 * Per-subject schedule coverage. Returns map { subjectKey: { covered, total } } for each subject
 * that appears in the schedule.
 */
export function getScheduleCoverageBySubject(doneMap) {
  const tally = {}
  for (const entry of schedule) {
    const d = doneMap[entry.day] || {}
    // primary is always Maths
    const primaryKey = entry.primary.subject
    tally[primaryKey] = tally[primaryKey] || { covered: 0, total: 0 }
    tally[primaryKey].total++
    if (d.primary) tally[primaryKey].covered++

    if (entry.secondary?.type === 'chapter') {
      const secKey = entry.secondary.subject
      tally[secKey] = tally[secKey] || { covered: 0, total: 0 }
      tally[secKey].total++
      if (d.secondary) tally[secKey].covered++
    }
  }
  return tally
}

/* ===== Tests (with score entry) ===== */

export function useTestsAttempted() {
  const [raw, setRaw] = useStoredReactive(TEST_KEY, {})
  const migrated = migrateTestsData(raw)
  return [migrated, setRaw]
}

export function setTestAttempted(testNum, attempted) {
  const raw = migrateTestsData(getStored(TEST_KEY, {}))
  const cur = raw[testNum] || { attempted: false, scores: {} }
  cur.attempted = attempted
  if (!attempted) cur.scores = {} // clear scores when un-marking
  raw[testNum] = cur
  setStored(TEST_KEY, raw)
}

export function setTestScore(testNum, paperSubject, score) {
  const raw = migrateTestsData(getStored(TEST_KEY, {}))
  const cur = raw[testNum] || { attempted: true, scores: {} }
  cur.scores = { ...cur.scores }
  if (score === null || score === undefined || score === '') {
    delete cur.scores[paperSubject]
  } else {
    cur.scores[paperSubject] = Number(score)
  }
  if (Object.keys(cur.scores).length > 0) cur.attempted = true
  raw[testNum] = cur
  setStored(TEST_KEY, raw)
}

/* ===== Misc helpers ===== */

export function getTotalChapterCount() {
  return Object.values(mcqs.subjects).reduce((n, s) => n + s.chapters.length, 0)
}

export function getQuizScoreFor(scores, chapterId) {
  return scores[chapterId] || null
}

export function getSubjectQuizProgress(scores, subjectKey) {
  const sub = mcqs.subjects[subjectKey]
  if (!sub) return { taken: 0, total: 0, avgPercent: 0 }
  let taken = 0, sumPct = 0
  for (const ch of sub.chapters) {
    const s = scores[ch.id]
    if (s && s.last) { taken++; sumPct += s.best }
  }
  return {
    taken,
    total: sub.chapters.length,
    avgPercent: taken > 0 ? Math.round(sumPct / taken) : 0,
  }
}
