import { Link } from 'react-router-dom'

const features = [
  ['📚', 'Chapter summaries & notes', 'Revise every CBSE Class 10 chapter with focused study material.'],
  ['🎯', 'MCQ practice', 'Build confidence with shuffled chapter quizzes and clear review.'],
  ['📝', 'Worksheets & mock tests', 'Practise on paper or online and keep every score together.'],
  ['📅', 'Your own study plan', 'Create a realistic plan around your exam date and track every day.'],
]

const packages = [
  { code: 'FREE', name: 'Free Trial', price: '₹0', note: '7 days', color: 'bg-sky/30' },
  { code: 'BASIC', name: 'Basic', price: '₹299', note: 'One-time · academic year', color: 'bg-sun/35' },
  { code: 'PRO', name: 'Pro', price: '₹999', note: 'One-time · academic year', color: 'bg-leaf/30' },
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/tenthkipadhai_logo.jpeg" alt="Tenth Ki Padhai" className="w-11 h-11 rounded-xl border-2 border-ink object-cover" />
          <span className="font-display font-extrabold text-xl">Tenth Ki Padhai</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login" className="btn-ghost px-3 py-2">Log in</Link>
          <Link to="/register" className="btn-primary px-4 py-2">Start studying</Link>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="chip bg-leaf/25 mb-4">Built for CBSE Class 10</div>
            <h1 className="heading-display text-4xl sm:text-6xl leading-[1.05]">A study plan that turns preparation into progress.</h1>
            <p className="text-lg text-ink/70 mt-5 max-w-xl">Plan your days, revise chapters, practise MCQs, complete worksheets and see exactly where you are improving.</p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link to="/register?package=FREE" className="btn-primary">Try free for 7 days →</Link>
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
              <article key={pkg.code} className={`card p-5 ${pkg.color}`}>
                <h3 className="font-display font-extrabold text-xl">{pkg.name}</h3>
                <div className="heading-display text-4xl mt-4">{pkg.price}</div>
                <div className="text-sm text-ink/65 mt-1">{pkg.note}</div>
                <Link to={`/register?package=${pkg.code}`} className="btn-primary w-full mt-5">Choose {pkg.name}</Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
