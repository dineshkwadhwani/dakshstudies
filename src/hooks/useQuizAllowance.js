import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export function useQuizAllowance() {
  const { user } = useAuth()
  const [state, setState] = useState({ allowance: null, loading: true, error: null })
  const reload = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.rpc('get_my_quiz_allowance')
    setState({ allowance: data, loading: false, error })
  }, [user])
  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}

