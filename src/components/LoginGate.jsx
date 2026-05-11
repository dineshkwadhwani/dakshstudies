import { useState, useEffect } from 'react'

const SESSION_KEY = 'daksh_authed'

export default function LoginGate({ children }) {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
  })

  if (authed) return children
  return <LockScreen onUnlock={() => {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
    setAuthed(true)
  }} />
}

function LockScreen({ onUnlock }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [now, setNow] = useState(() => new Date())

  // Tick clock once a minute so the visible timestamp stays current
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(t)
  }, [])

  const submit = (e) => {
    e?.preventDefault?.()
    const auth = typeof window !== 'undefined' ? window.__dakshAuth : null
    if (auth && auth.verify(input)) {
      onUnlock()
    } else {
      setError(true)
      setInput('')
      // brief shake feedback then clear error styling
      setTimeout(() => setError(false), 800)
    }
  }

  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo block */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-3xl border-2 border-ink bg-sun shadow-pop-lg grid place-items-center font-display font-extrabold text-5xl mb-4 animate-float">
            D
          </div>
          <h1 className="heading-display text-3xl text-center leading-tight">
            Welcome to your<br />Study Buddy
          </h1>
          <p className="text-ink/70 text-sm mt-2 text-center">Enter your password to continue</p>
        </div>

        {/* Timestamp display */}
        <div className="card p-4 mb-4 bg-cream text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-ink/60 mb-1">
            Right now
          </div>
          <div className="font-display font-bold text-base leading-tight">{dateStr}</div>
          <div className="font-mono text-2xl font-bold mt-1">{timeStr}</div>
        </div>

        {/* Password form */}
        <form onSubmit={submit} className={`card p-5 ${error ? 'animate-wiggle' : ''}`}>
          <label className="text-xs font-mono uppercase tracking-wider text-ink/60 block mb-2">
            Password
          </label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`w-full px-4 py-3 text-lg font-mono tracking-wider rounded-xl border-2 border-ink bg-paper focus:outline-none focus:shadow-pop transition-shadow ${error ? 'bg-flame/20' : ''}`}
            placeholder="••••••••••"
          />
          {error && (
            <div className="mt-2 text-sm text-flame font-bold">
              ✗ Wrong password — try again
            </div>
          )}
          <button
            type="submit"
            className="btn-primary w-full mt-4"
          >
            Unlock →
          </button>
          <p className="text-xs text-center text-ink/50 mt-4">
            Ask Daksh for today's password
          </p>
        </form>
      </div>
    </div>
  )
}
