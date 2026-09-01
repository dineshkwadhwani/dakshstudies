import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export function useStudyPlan() {
  const { user } = useAuth()
  const [state, setState] = useState({ plan: null, loading: true, error: null })
  const reload = useCallback(async () => {
    if (!user) return
    setState(current => ({ ...current, loading: true, error: null }))
    const { data, error } = await supabase
      .from('study_plans')
      .select('id,student_id,academic_year_id,name,starts_on,ends_on,status,activated_at,created_at,schedule_tasks(id,task_type,due_on,original_due_on,status,overlap_confirmed,completed_at,chapter_id,assessment_id,chapters(id,title,slug,legacy_id,subjects(id,name,slug,color,emoji)),assessments(id,title,maximum_marks,assessment_type))')
      .eq('student_id', user.id)
      .in('status', ['draft', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) setState({ plan: null, loading: false, error })
    else setState({ plan: data ? { ...data, schedule_tasks: [...(data.schedule_tasks || [])].sort((a, b) => a.due_on.localeCompare(b.due_on)) } : null, loading: false, error: null })
  }, [user])
  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}

export function planProgress(plan) {
  const tasks = plan?.schedule_tasks?.filter(task => task.status !== 'cancelled') || []
  const completed = tasks.filter(task => task.status === 'completed').length
  return { tasks, completed, total: tasks.length, complete: tasks.length > 0 && completed === tasks.length }
}
