import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export function useQuizAttempts() {
  const { user } = useAuth()
  const [state, setState] = useState({ attempts: [], loading: true, error: null })
  const reload = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.from('assessment_attempts')
      .select('id,mode,submitted_at,duration_seconds,score,maximum_score,percentage,assessment_id,assessments(id,title,chapter_id,chapters(id,title,slug,legacy_id,subjects(id,name,slug,color,emoji,parent_subject_id)))')
      .eq('student_id', user.id).eq('status', 'submitted').in('mode', ['practice', 'test']).order('submitted_at', { ascending: false })
    setState({ attempts: data || [], loading: false, error })
  }, [user])
  useEffect(() => { reload() }, [reload])
  const stats = useMemo(() => {
    const chapterBest = new Map()
    for (const attempt of state.attempts) {
      const chapterId = attempt.assessments?.chapter_id
      if (!chapterId) continue
      const existing = chapterBest.get(chapterId)
      if (!existing || Number(attempt.percentage) > Number(existing.percentage)) chapterBest.set(chapterId, attempt)
    }
    const average = state.attempts.length ? Math.round(state.attempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / state.attempts.length) : 0
    return { totalAttempts: state.attempts.length, chaptersAttempted: chapterBest.size, average, chapterBest }
  }, [state.attempts])
  return { ...state, stats, reload }
}
