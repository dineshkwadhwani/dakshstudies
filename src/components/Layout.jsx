import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

const STUDENT_NAV = [
  { to: '/dashboard', label: 'Home',     icon: HomeIcon },
  { to: '/schedule', label: 'Schedule', icon: CalIcon  },
  { to: '/chapters', label: 'Study',    icon: BookIcon },
  { to: '/tests',    label: 'Tests',    icon: TestIcon },
  { to: '/progress', label: 'Stats',    icon: StatsIcon },
]

const ADMIN_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/admin/subjects', label: 'Subjects', icon: BookIcon },
  { to: '/admin/content', label: 'Content', icon: UploadIcon },
  { to: '/admin/users', label: 'Users', icon: UsersIcon },
  { to: '/admin/config', label: 'Config', icon: ConfigIcon },
  { to: '/admin/audit', label: 'Audit', icon: AuditIcon },
]

export default function Layout({ children }) {
  const loc = useLocation()
  const navigate = useNavigate()
  const { profile, signOut, isImpersonating, impersonation, stopImpersonation } = useAuth()
  const isHome = loc.pathname === '/dashboard'
  const isPlatformUser = profile?.role === 'super_admin' || profile?.role === 'account_manager'
  const nav = isPlatformUser ? ADMIN_NAV.filter(item => profile?.role === 'super_admin' || !['/admin/subjects', '/admin/content', '/admin/config'].includes(item.to)) : STUDENT_NAV

  return (
    <div className="min-h-screen flex flex-col">
      {isImpersonating && <ImpersonationBanner impersonation={impersonation} stopImpersonation={stopImpersonation} />}
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b-2 border-ink">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            {!isHome && <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 grid place-items-center rounded-xl border-2 border-ink bg-paper shadow-pop hover:shadow-pop-lg active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
              aria-label="Back"
            >
              <BackIcon />
            </button>}
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/tenthkipadhai_logo.jpeg" alt="" className="w-9 h-9 rounded-xl border-2 border-ink object-cover" />
              <div className="font-display font-bold text-lg leading-none">
                Tenth Ki Padhai
              </div>
            </Link>
            <div className="ml-auto"><AccountMenu profile={profile} nav={nav} location={loc} signOut={signOut} /></div>
          </div>
        </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-4 pb-32 relative">
        {children}
      </main>

      {/* Bottom navigation — primary navigation on mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-paper border-t-2 border-ink shadow-[0_-4px_0_0_rgba(15,14,23,0.05)]">
        <div className="max-w-3xl mx-auto px-2 grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map(item => {
            const Icon = item.icon
            const active = item.to === '/dashboard'
              ? loc.pathname === '/dashboard'
              : loc.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`tappable flex flex-col items-center gap-0.5 py-2.5 px-1 transition-colors ${active ? 'text-ink' : 'text-ink/50'}`}
              >
                <div className={`w-9 h-9 grid place-items-center rounded-xl transition-all ${active ? 'bg-sun border-2 border-ink shadow-[2px_2px_0_0_#0F0E17]' : ''}`}>
                  <Icon active={active} />
                </div>
                <span className={`text-[10px] font-bold ${active ? 'text-ink' : 'text-ink/60'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-paper" />
      </nav>
    </div>
  )
}

function ImpersonationBanner({ impersonation, stopImpersonation }) {
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState('')
  const stop = async () => {
    setStopping(true); setError('')
    try { await stopImpersonation(); window.location.assign('/admin/users') }
    catch (stopError) { setError(stopError.message); setStopping(false) }
  }
  return <div className="sticky top-0 z-50 bg-flame text-paper border-b-2 border-ink"><div className="max-w-3xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm"><strong>Viewing as {impersonation?.targetProfile?.full_name || impersonation?.targetProfile?.email || 'another user'}</strong><button type="button" disabled={stopping} onClick={stop} className="rounded-lg border-2 border-ink bg-paper text-ink px-3 py-1 font-bold shadow-pop">{stopping ? 'Returning…' : 'Return to SuperAdmin'}</button>{error && <span className="w-full text-center text-xs">{error}</span>}</div></div>
}

function AccountMenu({ profile, nav, location, signOut }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    const close = event => { if (!menuRef.current?.contains(event.target)) setOpen(false) }
    const escape = event => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [])
  const logout = async () => { setOpen(false); await signOut(); navigate('/', { replace: true }) }
  const initials = (profile?.full_name || 'User').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <div className="relative" ref={menuRef}>
    <button type="button" aria-label="Open account menu" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex items-center gap-2 rounded-xl border-2 border-ink bg-paper p-1.5 pr-2.5 shadow-pop hover:shadow-pop-lg transition-all">
      <span className="w-8 h-8 rounded-lg bg-sun border-2 border-ink grid place-items-center font-display font-extrabold text-xs">{initials}</span>
      <span className="hidden sm:block text-xs font-bold max-w-28 truncate">{profile?.full_name || 'My account'}</span>
      <ChevronIcon />
    </button>
    {open && <div className="absolute right-0 mt-3 w-64 card rounded-2xl p-2 shadow-pop-lg bg-paper z-50">
      <div className="px-3 py-2 border-b border-ink/15 mb-1"><div className="font-bold truncate">{profile?.full_name || 'My account'}</div><div className="text-xs text-ink/50 capitalize">{profile?.role?.replace('_', ' ')}</div></div>
      <MenuLink to="/profile" label="Profile" icon={ProfileIcon} active={location.pathname === '/profile'} />
      <MenuLink to="/referrals" label="My referrals" icon={ReferralIcon} active={location.pathname === '/referrals'} />
      <div className="my-1 border-t border-ink/15" />
      {nav.map(item => <MenuLink key={item.to} to={item.to} label={item.label} icon={item.icon} active={item.to === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(item.to)} />)}
      <div className="my-1 border-t border-ink/15" />
      <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold text-sm hover:bg-flame/15"><LogoutIcon />Log out</button>
    </div>}
  </div>
}

function MenuLink({ to, label, icon: Icon, active }) { return <Link to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold ${active ? 'bg-sun/35' : 'hover:bg-cream'}`}><span className="w-6 grid place-items-center"><Icon /></span>{label}</Link> }

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" />
    </svg>
  )
}
function CalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2Z" /><path d="M8 7h8M8 11h8" />
    </svg>
  )
}
function TestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l2 2 4-4" /><rect x="4" y="3" width="16" height="18" rx="2" />
    </svg>
  )
}
function StatsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V10M12 21V3M19 21v-7" />
    </svg>
  )
}
function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function ChevronIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg> }
function ProfileIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg> }
function ReferralIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/></svg> }
function LogoutIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6"/></svg> }
function UploadIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 15v5h16v-5"/></svg> }
function UsersIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5c3 0 4 2 4 4s-1 4-4 4"/></svg> }
function ConfigIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1-2-4-2 1a7 7 0 0 0-2-1l-.3-2h-5l-.3 2a7 7 0 0 0-2 1l-2-1-2 4 2 1a7 7 0 0 0 0 2l-2 1 2 4 2-1a7 7 0 0 0 2 1l.3 2h5l.3-2a7 7 0 0 0 2-1l2 1 2-4-2-1c.1-.3.1-.7.1-1Z"/></svg> }
function AuditIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6l1 2h3v16H5V5h3Z"/><path d="M9 11h6M9 15h6"/></svg> }
