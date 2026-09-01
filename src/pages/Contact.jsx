import { useState } from 'react'
import PublicPageLayout, { InfoSection } from '../components/PublicPageLayout.jsx'

const initialForm = { name: '', email: '', phone: '', subject: '', message: '', website: '' }

export default function Contact() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) => setForm(current => ({ ...current, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Your message could not be sent. Please email us directly.')
      setForm(initialForm)
      setStatus({ type: 'success', message: 'Thank you. Your message has been sent to our customer-care team.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return <PublicPageLayout eyebrow="We’re here to help" title="Contact Us" intro="Questions about your account, package, payment or study experience? Send us a message or contact our customer-care team directly.">
    <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-5 items-start">
      <section className="card p-5 sm:p-7">
        <h2 className="heading-display text-2xl">Send an enquiry</h2>
        <p className="text-sm text-ink/60 mt-2">Fields marked * are required.</p>
        <form onSubmit={submit} className="mt-5 grid sm:grid-cols-2 gap-4">
          <ContactField label="Full name *" value={form.name} onChange={update('name')} autoComplete="name" />
          <ContactField label="Email address *" type="email" value={form.email} onChange={update('email')} autoComplete="email" />
          <ContactField label="Phone number" type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" required={false} />
          <ContactField label="Subject *" value={form.subject} onChange={update('subject')} />
          <label className="sm:col-span-2"><span className="text-xs font-mono uppercase tracking-wider text-ink/60">Message *</span><textarea className="form-control min-h-36 resize-y" required maxLength={4000} value={form.message} onChange={update('message')} /></label>
          <label className="hidden" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={update('website')} /></label>
          {status.message && <div role="status" className={`sm:col-span-2 rounded-xl border-2 p-3 text-sm ${status.type === 'success' ? 'border-ink bg-leaf/25' : 'border-flame bg-flame/15'}`}>{status.message}</div>}
          <button className="btn-primary sm:col-span-2" disabled={submitting}>{submitting ? 'Sending…' : 'Send enquiry →'}</button>
        </form>
      </section>
      <div className="space-y-5">
        <InfoSection title="Customer care"><p><a className="underline break-all" href="mailto:contact@tenthkipadhai.online">contact@tenthkipadhai.online</a></p><p><a href="tel:+919604188725">+91 96041 88725</a><br /><a href="tel:+919604188726">+91 96041 88726</a></p></InfoSection>
        <InfoSection title="Operating company"><p className="font-bold text-ink">Tracksoft Solutions Private Limited</p><p>Office 302A, Rose Icon Amenity Building<br />Pimple Saudagar, Pune<br />Maharashtra 411027, India</p><p><a className="underline break-all" href="mailto:contact@tracksoftsolutions.com">contact@tracksoftsolutions.com</a></p></InfoSection>
        <InfoSection title="Grievances"><p>For account, privacy, payment or service complaints, use the form or email the Tenth Ki Padhai Administrator at the customer-care address above.</p></InfoSection>
      </div>
    </div>
  </PublicPageLayout>
}

function ContactField({ label, required = true, ...props }) {
  return <label><span className="text-xs font-mono uppercase tracking-wider text-ink/60">{label}</span><input className="form-control" required={required} maxLength={200} {...props} /></label>
}
