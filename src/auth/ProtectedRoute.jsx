import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function ProtectedRoute({ children, roles, allowIncompleteProfile = false }) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.configured) return <ConfigurationRequired />
  if (auth.loading) return <CenteredMessage title="Loading your account…" />
  if (!auth.user) return <Navigate to="/login" replace state={{ from: location }} />
  if (auth.profileError) return <CenteredMessage title="We couldn't load your profile" detail={auth.profileError.message} />
  if (auth.profile?.status === 'deactivated') return <AccountDeactivated onSignOut={auth.signOut} />
  if (!allowIncompleteProfile && auth.profile?.role === 'student' && auth.profile?.onboarding_step !== 'complete') {
    return <Navigate to="/onboarding" replace />
  }
  if (roles && auth.profile && !roles.includes(auth.profile.role)) return <Navigate to="/dashboard" replace />

  return children
}

function ConfigurationRequired() {
  return (
    <CenteredMessage
      title="Supabase configuration required"
      detail="Add VITE_SUPABASE_PROJECT_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the development server."
    />
  )
}

function AccountDeactivated({ onSignOut }) {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card max-w-md p-6 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="heading-display text-2xl">Account deactivated</h1>
        <p className="text-ink/70 mt-2">Please contact platform support if you believe this is a mistake.</p>
        <button className="btn-secondary mt-5" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}

function CenteredMessage({ title, detail }) {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card max-w-lg p-6 text-center">
        <h1 className="heading-display text-2xl">{title}</h1>
        {detail && <p className="text-ink/70 mt-2">{detail}</p>}
      </div>
    </div>
  )
}
