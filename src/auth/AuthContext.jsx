import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)
const IMPERSONATION_KEY = 'daksh-impersonation-session'

function readImpersonation() {
  try { return JSON.parse(window.sessionStorage.getItem(IMPERSONATION_KEY)) }
  catch { return null }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [profileError, setProfileError] = useState(null)
  const [impersonation, setImpersonation] = useState(readImpersonation)

  const loadProfile = useCallback(async (user) => {
    if (!supabase || !user) {
      setProfile(null)
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      setProfileError(error)
      setProfile(null)
      return null
    }

    setProfileError(null)
    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user)
      if (mounted) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        setTimeout(() => loadProfile(nextSession.user), 0)
        if (event === 'SIGNED_IN' && !readImpersonation()) setTimeout(() => supabase.rpc('record_own_login'), 0)
      } else {
        setProfile(null)
        setProfileError(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    window.sessionStorage.removeItem(IMPERSONATION_KEY)
    setImpersonation(null)
    if (supabase) await supabase.auth.signOut()
  }, [])

  const startImpersonation = useCallback(async (tokenHash, targetProfile) => {
    if (!supabase || !session || profile?.role !== 'super_admin' || impersonation) throw new Error('Impersonation is not available')
    const saved = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      originalProfile: profile,
      targetProfile: { id: targetProfile.id, full_name: targetProfile.full_name, email: targetProfile.email },
    }
    window.sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(saved))
    setImpersonation(saved)
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (error) {
      window.sessionStorage.removeItem(IMPERSONATION_KEY)
      setImpersonation(null)
      throw error
    }
  }, [session, profile, impersonation])

  const stopImpersonation = useCallback(async () => {
    const saved = readImpersonation()
    if (!supabase || !saved?.accessToken || !saved?.refreshToken) throw new Error('The original session is no longer available. Please sign in again.')
    const { error } = await supabase.auth.setSession({ access_token: saved.accessToken, refresh_token: saved.refreshToken })
    if (error) throw error
    window.sessionStorage.removeItem(IMPERSONATION_KEY)
    setImpersonation(null)
  }, [])

  const value = useMemo(() => ({
    configured: isSupabaseConfigured,
    session,
    user: session?.user || null,
    profile,
    profileError,
    loading,
    reloadProfile: () => loadProfile(session?.user),
    signOut,
    isImpersonating: Boolean(impersonation),
    impersonation,
    startImpersonation,
    stopImpersonation,
  }), [session, profile, profileError, loading, impersonation, loadProfile, signOut, startImpersonation, stopImpersonation])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
