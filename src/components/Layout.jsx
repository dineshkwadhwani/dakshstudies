import { Link, useLocation, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/',         label: 'Home',     icon: HomeIcon },
  { to: '/schedule', label: 'Schedule', icon: CalIcon  },
  { to: '/chapters', label: 'Study',    icon: BookIcon },
  { to: '/tests',    label: 'Tests',    icon: TestIcon },
  { to: '/progress', label: 'Stats',    icon: StatsIcon },
]

export default function Layout({ children }) {
  const loc = useLocation()
  const navigate = useNavigate()
  const isHome = loc.pathname === '/'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header — hidden on home page since home has its own hero */}
      {!isHome && (
        <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b-2 border-ink">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 grid place-items-center rounded-xl border-2 border-ink bg-paper shadow-pop hover:shadow-pop-lg active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
              aria-label="Back"
            >
              <BackIcon />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl grid place-items-center bg-sun border-2 border-ink font-display font-extrabold text-lg">
                D
              </div>
              <div className="font-display font-bold text-lg leading-none">
                Study Lab
              </div>
            </Link>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-4 pb-32 relative">
        {children}
      </main>

      {/* Bottom navigation — primary navigation on mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-paper border-t-2 border-ink shadow-[0_-4px_0_0_rgba(15,14,23,0.05)]">
        <div className="max-w-3xl mx-auto px-2 grid grid-cols-5">
          {NAV.map(item => {
            const Icon = item.icon
            const active = item.to === '/'
              ? loc.pathname === '/'
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
