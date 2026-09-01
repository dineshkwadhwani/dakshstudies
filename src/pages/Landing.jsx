import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter.jsx'
import { supabase } from '../lib/supabase.js'

const features = [
  ['📚', 'Chapter summaries & notes', 'Revise every CBSE Class 10 chapter with focused study material.'],
  ['🎯', 'MCQ practice', 'Build confidence with shuffled chapter quizzes and clear review.'],
  ['📝', 'Worksheets & mock tests', 'Practise on paper or online and keep every score together.'],
  ['📅', 'Your own study plan', 'Create a realistic plan around your exam date and track every day.'],
]

const fallbackPackages = [
  { code: 'FREE', name: 'Free Trial', price_paise: 0, trial_days: 7, package_type: 'trial', sale_enabled: true, quiz_attempt_fixed_limit: 10, display_features: ['7-day access', 'Chapter summaries and notes', 'Worksheets and mock tests', '10 quiz attempts', 'Personal study schedule'] },
  { code: 'BASIC', name: 'Basic', price_paise: 29900, package_type: 'paid', sale_enabled: true, quiz_attempt_fixed_limit: 100, display_features: ['Access for the academic year', 'All chapter summaries and notes', 'Worksheets and mock tests', '100 quiz attempts', 'Progress reports'] },
  { code: 'PRO', name: 'Pro', price_paise: 99900, package_type: 'paid', sale_enabled: true, quiz_attempt_fixed_limit: 300, display_features: ['Access for the academic year', 'All chapter summaries and notes', 'Worksheets and mock tests', '300 quiz attempts', 'Progress reports'] },
]

const packageColors = { FREE: 'bg-sky/30', BASIC: 'bg-sun/35', PRO: 'bg-leaf/30' }
const price = paise => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((Number(paise) || 0) / 100)

export default function Landing() {
  const [params] = useSearchParams()
  const referralCode = (params.get('ref') || params.get('source') || '').trim().toUpperCase()
  const [packages, setPackages] = useState(fallbackPackages)

  useEffect(() => {
    if (referralCode) window.sessionStorage.setItem('tenthkipadhai_referral_code', referralCode)
  }, [referralCode])

  const registrationUrl = packageCode => {
    const query = new URLSearchParams()
    if (packageCode) query.set('package', packageCode)
    if (referralCode) query.set('ref', referralCode)
    const queryString = query.toString()
    return queryString ? `/register?${queryString}` : '/register'
  }

  useEffect(() => {
    if (!supabase) return
    let active = true
    async function loadPackages() {
      const { data: year } = await supabase.from('academic_years').select('id').eq('is_current', true).maybeSingle()
      if (!year || !active) return
      const { data, error } = await supabase.from('packages').select('code,name,rank,price_paise,original_price_paise,show_offer,package_type,trial_days,fixed_expires_on,quiz_attempt_fixed_limit,display_features,sale_enabled').eq('academic_year_id', year.id).order('rank')
      if (!error && data?.length && active) setPackages(data)
    }
    loadPackages()
    return () => { active = false }
  }, [])

  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/tenthkipadhai_logo.jpeg" alt="Tenth Ki Padhai" className="w-11 h-11 rounded-xl border-2 border-ink object-cover" />
          <span className="font-display font-extrabold text-xl">Tenth Ki Padhai</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login" className="btn-ghost px-3 py-2">Log in</Link>
          <Link to={registrationUrl()} className="btn-primary px-4 py-2">Start studying</Link>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="chip bg-leaf/25 mb-4">Built for CBSE Class 10</div>
            <h1 className="heading-display text-4xl sm:text-6xl leading-[1.05]">A study plan that turns preparation into progress.</h1>
            <p className="text-lg text-ink/70 mt-5 max-w-xl">Plan your days, revise chapters, practise MCQs, complete worksheets and see exactly where you are improving.</p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link to={registrationUrl('FREE')} className="btn-primary">Try free for 7 days →</Link>
              <a href="#features" className="btn-secondary">See how it helps</a>
            </div>
          </div>
          <div className="card p-6 bg-violet/20">
            <div className="font-mono text-xs uppercase tracking-widest text-ink/60">Your preparation today</div>
            <div className="mt-4 space-y-3">
              {['Revise Real Numbers', 'Take a 25-question MCQ quiz', 'Complete Science worksheet'].map((item, i) => (
                <div key={item} className="rounded-2xl border-2 border-ink bg-paper p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 border-2 border-ink rounded-xl grid place-items-center ${i === 0 ? 'bg-leaf' : 'bg-cream'}`}>{i === 0 ? '✓' : i + 1}</div>
                  <div className="font-display font-bold">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="heading-display text-3xl sm:text-4xl text-center">Everything in one study companion</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {features.map(([icon, title, text]) => (
              <article key={title} className="card p-5">
                <div className="text-4xl">{icon}</div>
                <h3 className="font-display font-extrabold text-lg mt-3">{title}</h3>
                <p className="text-sm text-ink/65 mt-2">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-12 mb-12">
          <h2 className="heading-display text-3xl text-center">Choose your package</h2>
          <p className="text-center text-ink/65 mt-2">One account, your own plan, and progress that follows you.</p>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {packages.map(pkg => (
              <article key={pkg.code} className={`card p-5 flex flex-col ${packageColors[pkg.code] || 'bg-paper'}`}>
                <div className="flex items-start justify-between gap-2"><h3 className="font-display font-extrabold text-xl">{pkg.name}</h3>{pkg.show_offer && <span className="chip bg-paper text-xs">Special offer</span>}</div>
                <div className="mt-4 flex items-baseline gap-2">{pkg.show_offer && <span className="text-ink/45 line-through text-lg">{price(pkg.original_price_paise)}</span>}<span className="heading-display text-4xl">{price(pkg.price_paise)}</span></div>
                <div className="text-sm text-ink/65 mt-1">{pkg.package_type === 'trial' ? `${pkg.trial_days} days` : 'One-time · academic year'}</div>
                <ul className="mt-5 space-y-2 flex-1">
                  {(pkg.display_features || []).map(feature => <li className="flex gap-2 text-sm" key={feature}><span className="font-bold text-green-700">✓</span><span>{feature}</span></li>)}
                </ul>
                {pkg.sale_enabled
                  ? <Link to={registrationUrl(pkg.code)} className="btn-primary w-full mt-6">Choose {pkg.name}</Link>
                  : <button type="button" disabled className="btn-secondary w-full mt-6 cursor-not-allowed opacity-65">Coming Soon</button>}
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
