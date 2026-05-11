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
 * Find a chapter by its id alone (without knowing subject) — useful when
 * a schedule entry references a chapter id only.
 */
export function findChapterById(chapterId) {
  for (const [key, sub] of Object.entries(mcqs.subjects)) {
    const ch = sub.chapters.find(c => c.id === chapterId)
    if (ch) return { subjectKey: key, subject: sub, chapter: ch }
  }
  return null
}

/* ===== Progress helpers ===== */
const QUIZ_KEY = 'quizScores'        // { [chapterId]: { best, last, attempts: [...] } }
const STUDY_KEY = 'studiedChapters'  // { [chapterId]: true }
const SCHEDULE_KEY = 'scheduleDone'  // { [day]: true }
const TEST_KEY = 'testsAttempted'    // { [testNumber]: true }

export function recordQuizAttempt(chapterId, attempt) {
  // attempt: { mode, score, total, percent, date, durationSec, mistakes: [...] }
  const all = getStored(QUIZ_KEY, {})
  const cur = all[chapterId] || { attempts: [], best: 0 }
  cur.attempts = [attempt, ...cur.attempts].slice(0, 10) // keep last 10
  cur.last = attempt
  cur.best = Math.max(cur.best || 0, attempt.percent)
  all[chapterId] = cur
  setStored(QUIZ_KEY, all)
  return cur
}

export function useQuizScores() {
  const [scores] = useStoredReactive(QUIZ_KEY, {})
  return scores
}

export function useStudiedChapters() {
  return useStoredReactive(STUDY_KEY, {})
}

export function useScheduleDone() {
  return useStoredReactive(SCHEDULE_KEY, {})
}

export function useTestsAttempted() {
  return useStoredReactive(TEST_KEY, {})
}

/**
 * Total chapters across all subjects.
 */
export function getTotalChapterCount() {
  return Object.values(mcqs.subjects).reduce((n, s) => n + s.chapters.length, 0)
}

export function getQuizScoreFor(scores, chapterId) {
  return scores[chapterId] || null
}

/**
 * Subject-wise quiz progress: returns { taken, total, avgPercent }
 */
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
