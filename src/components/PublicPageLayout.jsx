import { Link } from 'react-router-dom'
import SiteFooter from './SiteFooter.jsx'

export default function PublicPageLayout({ eyebrow, title, intro, children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-ink bg-cream/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/tenthkipadhai_logo.jpeg" alt="" className="w-10 h-10 rounded-xl border-2 border-ink object-cover" />
            <span className="font-display font-extrabold text-lg">Tenth Ki Padhai</span>
          </Link>
          <Link to="/" className="btn-secondary px-4 py-2">← Home</Link>
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-10 sm:py-14">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-ink/60">{eyebrow}</div>
        <h1 className="heading-display text-4xl sm:text-5xl mt-2">{title}</h1>
        {intro && <p className="text-lg text-ink/65 mt-4 max-w-3xl">{intro}</p>}
        <div className="mt-8 space-y-5">{children}</div>
      </main>
      <SiteFooter />
    </div>
  )
}

export function InfoSection({ title, children }) {
  return <section className="card p-5 sm:p-7"><h2 className="heading-display text-2xl">{title}</h2><div className="mt-3 space-y-3 text-ink/75 leading-relaxed">{children}</div></section>
}
