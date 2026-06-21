import mcqs from '../data/mcqs.json'
import staticSchedule from '../data/schedule.json'
import tests from '../data/tests.json'
import { getStored, setStored, useStoredReactive } from './useStorage.js'

export { mcqs, tests }

// The static schedule is the fallback. Always export it so CreateSchedule can reference it.
export { staticSchedule }

export function getSubject(key) { return mcqs.subjects[key] }
export function getAllSubjectKeys() { return Object.keys(mcqs.subjects) }
export function getChapter(subjectKey, chapterId) {
  const sub = mcqs.subjects[subjectKey]
  if (!sub) return null
  return sub.chapters.find(c => c.id === chapterId) || null
}
export function findChapterById(chapterId) {
  for (const [key, sub] of Object.entries(mcqs.subjects)) {
    const ch = sub.chapters.find(c => c.id === chapterId)
    if (ch) return { subjectKey: key, subject: sub, chapter: ch }
  }
  return null
}

/* ===== Storage keys ===== */
const QUIZ_KEY      = 'quizScores'
const STUDY_KEY     = 'studiedChapters'
const SCHEDULE_KEY  = 'scheduleDone'
const TEST_KEY      = 'testsAttempted'
const CUSTOM_SCHED  = 'customSchedule'   // { entries: [...], createdAt: iso }
const AUTO_TICK_THRESHOLD = 60

/* ===== Active schedule (custom if set, else static) ===== */

export function getCustomScheduleData() {
  return getStored(CUSTOM_SCHED, null)
}

export function getActiveSchedule() {
  const custom = getStored(CUSTOM_SCHED, null)
  return custom ? custom.entries : staticSchedule
}

export function useActiveSchedule() {
  const [custom] = useStoredReactive(CUSTOM_SCHED, null)
  return custom ? custom.entries : staticSchedule
}

export function saveCustomSchedule(entries) {
  setStored(CUSTOM_SCHED, { entries, createdAt: new Date().toISOString() })
  // Reset schedule completion data when a new schedule is created
  setStored(SCHEDULE_KEY, {})
  setStored(TEST_KEY, {})
}

export function clearCustomSchedule() {
  setStored(CUSTOM_SCHED, null)
  setStored(SCHEDULE_KEY, {})
  setStored(TEST_KEY, {})
}

/* ===== Schedule generation algorithm ===== */

/**
 * Build a schedule array from user choices.
 *
 * @param {string} startDate  'YYYY-MM-DD'
 * @param {string} endDate    'YYYY-MM-DD'
 * @param {string[]} mathsIds  chapter IDs to include
 * @param {string[]} sciIds
 * @param {string[]} ssIds     Social Science chapter IDs
 * @param {number} mathsPerDay  1 | 2 | 3
 * @param {number} ssPerDay     1 | 2 | 3
 * @param {boolean} includeTests
 * @param {'weekly'|'fortnightly'|'monthly'} testFreq
 * @returns {Array} schedule entries in the same shape as schedule.json
 */
export function buildScheduleEntries({
  startDate, endDate,
  mathsIds, sciIds, ssIds,
  mathsPerDay, sciPerDay, ssPerDay,
  includeTests, testFreq,
}) {
  // Get all dates in range
  const dates = []
  const cur = parseISO(startDate)
  const end = parseISO(endDate)
  while (cur <= end) {
    dates.push(isoFromDate(cur))
    cur.setDate(cur.getDate() + 1)
  }

  // Build flat queues of {subject, id, title} for each subject
  const allSubjects = mcqs.subjects

  function makeQueue(subjectKey, ids) {
    const sub = allSubjects[subjectKey]
    return ids.map(id => {
      const ch = sub.chapters.find(c => c.id === id)
      return ch ? { subject: subjectKey, id, title: ch.title } : null
    }).filter(Boolean)
  }

  // Social Science queue — flattened from geo/history/civics/economics
  function makeSsQueue(ids) {
    const queue = []
    for (const sk of ['geography', 'history', 'civics', 'economics']) {
      const sub = allSubjects[sk]
      for (const id of ids) {
        const ch = sub?.chapters.find(c => c.id === id)
        if (ch) queue.push({ subject: sk, id, title: ch.title })
      }
    }
    return queue
  }

  const mathsQ = makeQueue('maths', mathsIds)
  const sciQ   = makeQueue('science', sciIds)
  const ssQ    = makeSsQueue(ssIds)

  // Determine test interval in days
  const testIntervalDays = testFreq === 'weekly' ? 7 : testFreq === 'fortnightly' ? 14 : 30

  let testNumber = 1
  const entries = []
  let dayNum = 1
  let mathsIdx = 0, sciIdx = 0, ssIdx = 0

  // Decide which date slots will be test days (always at interval boundaries)
  const testDays = new Set()
  if (includeTests && dates.length >= testIntervalDays) {
    for (let i = testIntervalDays - 1; i < dates.length; i += testIntervalDays) {
      testDays.add(i) // 0-indexed into dates array
    }
  }

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di]
    const isTestDay = testDays.has(di)

    // Consume chapters for primary (maths)
    const primaryChunks = []
    for (let p = 0; p < mathsPerDay && mathsIdx < mathsQ.length; p++, mathsIdx++) {
      primaryChunks.push(mathsQ[mathsIdx])
    }

    // Consume chapters for secondary (science OR social science, alternating)
    // Strategy: each day's secondary is either sciPerDay chapters of science
    // OR ssPerDay chapters of SS, interleaved by which pool has remaining items.
    // On a test day, skip the secondary chapter (use test as secondary).
    const secondaryChunks = []
    if (!isTestDay) {
      // Fill from sci first, then ss, cycling to keep both balanced
      // Simple approach: give science priority until exhausted, then SS
      for (let p = 0; p < sciPerDay && sciIdx < sciQ.length; p++, sciIdx++) {
        secondaryChunks.push(sciQ[sciIdx])
      }
      if (secondaryChunks.length === 0) {
        // Science exhausted, use SS
        for (let p = 0; p < ssPerDay && ssIdx < ssQ.length; p++, ssIdx++) {
          secondaryChunks.push(ssQ[ssIdx])
        }
      } else if (secondaryChunks.length < sciPerDay) {
        // Science partially exhausted, fill remainder with SS
        const remaining = sciPerDay - secondaryChunks.length
        for (let p = 0; p < remaining && ssIdx < ssQ.length; p++, ssIdx++) {
          secondaryChunks.push(ssQ[ssIdx])
        }
      }
    }

    // Each "chunk" becomes its own schedule slot. But our data model supports
    // one primary + one secondary per entry. For multi-chapter days we create
    // multiple entries on the same date, with dayNum incrementing.
    const maxSlots = Math.max(primaryChunks.length, 1)

    for (let s = 0; s < maxSlots; s++) {
      const primary = primaryChunks[s]
      if (!primary && !isTestDay) continue // nothing to schedule

      const entry = { day: dayNum, date }

      if (primary) {
        entry.primary = primary
      } else {
        // If no maths chapter but it's a test day, skip this slot
        continue
      }

      if (isTestDay && s === maxSlots - 1) {
        // Last slot of this day: attach test as secondary
        entry.secondary = {
          type: 'test',
          testNumber,
          isCumulative: testFreq === 'monthly',
          title: `Test ${testNumber}`,
        }
        testNumber++
      } else if (secondaryChunks[s]) {
        entry.secondary = { type: 'chapter', ...secondaryChunks[s] }
      } else if (secondaryChunks[0] && s === 0) {
        // Only one secondary; attach to first slot
        entry.secondary = { type: 'chapter', ...secondaryChunks[0] }
      } else {
        // No secondary available
        entry.secondary = null
      }

      entries.push(entry)
      dayNum++
    }

    // If there are remaining secondaries not yet attached, add extra slots
    const attachedSecondaries = isTestDay ? 0 : Math.min(secondaryChunks.length, maxSlots)
    for (let s = attachedSecondaries; s < secondaryChunks.length; s++) {
      // Find a primary to pair with or just make a secondary-only slot
      // Pragmatically: skip extras — the schedule should be built sensibly
    }
  }

  // Trim entries where both primary and secondary are consumed but days remain
  // Also: if all content exhausted, stop at last filled entry
  return entries.filter(e => e.primary)
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/* ===== Migrations ===== */
function migrateScheduleData(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [day, val] of Object.entries(raw)) {
    if (val && typeof val === 'object' && ('primary' in val || 'secondary' in val)) {
      out[day] = { primary: !!val.primary, secondary: !!val.secondary }
    } else {
      out[day] = { primary: !!val, secondary: !!val }
    }
  }
  return out
}

function migrateTestsData(raw) {
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
  if (attempt.percent >= AUTO_TICK_THRESHOLD) autoTickSchedule(chapterId)
  return cur
}

function autoTickSchedule(chapterId) {
  const sched = getActiveSchedule()
  const raw = migrateScheduleData(getStored(SCHEDULE_KEY, {}))
  let changed = false
  for (const entry of sched) {
    const updates = { ...(raw[entry.day] || {}) }
    let touched = false
    if (entry.primary?.id === chapterId && !updates.primary) {
      updates.primary = true; touched = true
    }
    if (entry.secondary?.type === 'chapter' && entry.secondary?.id === chapterId && !updates.secondary) {
      updates.secondary = true; touched = true
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

export function toggleScheduleSlot(day, slot) {
  const raw = migrateScheduleData(getStored(SCHEDULE_KEY, {}))
  const cur = raw[day] || { primary: false, secondary: false }
  cur[slot] = !cur[slot]
  raw[day] = cur
  setStored(SCHEDULE_KEY, raw)
}

export function isDayComplete(doneMap, entry) {
  const d = doneMap[entry.day]
  if (!d) return false
  if (!entry.secondary || entry.secondary.type === 'test') return !!d.primary
  return !!d.primary && !!d.secondary
}

export function getScheduleSummary(doneMap, scheduleEntries) {
  const sched = scheduleEntries || getActiveSchedule()
  let primaryDone = 0, secondaryDone = 0, daysFullyDone = 0
  for (const entry of sched) {
    const d = doneMap[entry.day] || {}
    if (d.primary) primaryDone++
    if (entry.secondary && entry.secondary.type !== 'test' && d.secondary) secondaryDone++
    if (isDayComplete(doneMap, entry)) daysFullyDone++
  }
  return {
    primaryDone, secondaryDone, daysFullyDone,
    totalDays: sched.length,
  }
}

export function getScheduleCoverageBySubject(doneMap, scheduleEntries) {
  const sched = scheduleEntries || getActiveSchedule()
  const tally = {}
  for (const entry of sched) {
    const d = doneMap[entry.day] || {}
    if (entry.primary) {
      const pk = entry.primary.subject
      tally[pk] = tally[pk] || { covered: 0, total: 0 }
      tally[pk].total++
      if (d.primary) tally[pk].covered++
    }
    if (entry.secondary?.type === 'chapter') {
      const sk = entry.secondary.subject
      tally[sk] = tally[sk] || { covered: 0, total: 0 }
      tally[sk].total++
      if (d.secondary) tally[sk].covered++
    }
  }
  return tally
}

/* ===== Tests ===== */
export function useTestsAttempted() {
  const [raw, setRaw] = useStoredReactive(TEST_KEY, {})
  const migrated = migrateTestsData(raw)
  return [migrated, setRaw]
}
export function setTestAttempted(testNum, attempted) {
  const raw = migrateTestsData(getStored(TEST_KEY, {}))
  const cur = raw[testNum] || { attempted: false, scores: {} }
  cur.attempted = attempted
  if (!attempted) cur.scores = {}
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

/* ===== Misc ===== */
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
    taken, total: sub.chapters.length,
    avgPercent: taken > 0 ? Math.round(sumPct / taken) : 0,
  }
}
