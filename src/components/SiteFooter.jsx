import { Link } from 'react-router-dom'

const legalLinks = [
  ['/contact', 'Contact Us'],
  ['/terms', 'Terms and Conditions'],
  ['/privacy', 'Privacy Policy'],
  ['/refund-policy', 'Cancellation & Refunds'],
]

export default function SiteFooter({ compact = false }) {
  return (
    <footer className="border-t-2 border-ink bg-paper/75">
      <div className={`max-w-6xl mx-auto px-4 ${compact ? 'py-7' : 'py-10'} grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]`}>
        <div>
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/tenthkipadhai_logo.jpeg" alt="" className="w-10 h-10 rounded-xl border-2 border-ink object-cover" />
            <span className="font-display font-extrabold text-lg">Tenth Ki Padhai</span>
          </Link>
          <p className="text-sm text-ink/65 mt-3 max-w-sm">A CBSE Class 10 study companion and an initiative of Tracksoft Solutions Private Limited.</p>
        </div>
        <div>
          <h2 className="font-display font-extrabold">Information</h2>
          <nav aria-label="Legal and contact information" className="mt-3 grid gap-2 text-sm">
            {legalLinks.map(([to, label]) => <Link key={to} to={to} className="underline underline-offset-4 hover:text-ink/60">{label}</Link>)}
          </nav>
        </div>
        <div className="text-sm">
          <h2 className="font-display font-extrabold">Customer care</h2>
          <div className="mt-3 grid gap-2 text-ink/70">
            <a className="underline underline-offset-4" href="mailto:contact@tenthkipadhai.online">contact@tenthkipadhai.online</a>
            <div><a href="tel:+919604188725">+91 96041 88725</a> · <a href="tel:+919604188726">+91 96041 88726</a></div>
          </div>
        </div>
      </div>
      <div className="border-t border-ink/20 px-4 py-4 text-center text-xs text-ink/60">© 2026 Tracksoft Solutions Private Limited. All rights reserved.</div>
    </footer>
  )
}
