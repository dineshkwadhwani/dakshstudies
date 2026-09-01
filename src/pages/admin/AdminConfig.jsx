import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { PageTitle } from './AdminSubjects.jsx'

const rupees = paise => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((Number(paise) || 0) / 100)
const toPaise = value => Math.round((Number(value) || 0) * 100)

export default function AdminConfig() {
  const [packages, setPackages] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [featureText, setFeatureText] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('packages').select('*').order('rank')
    if (error) setMessage(error.message)
    else setPackages(data || [])
  }
  useEffect(() => { load() }, [])

  const startEditing = pkg => {
    setEditingId(pkg.id)
    setDraft({ ...pkg, display_features: [...(pkg.display_features || [])] })
    setFeatureText('')
    setMessage('')
  }
  const cancelEditing = () => { setEditingId(null); setDraft(null); setFeatureText('') }
  const change = values => setDraft(current => ({ ...current, ...values }))
  const addFeature = () => {
    const feature = featureText.trim()
    if (!feature || draft.display_features.some(item => item.toLowerCase() === feature.toLowerCase())) return
    change({ display_features: [...draft.display_features, feature] })
    setFeatureText('')
  }
  const removeFeature = index => change({ display_features: draft.display_features.filter((_, itemIndex) => itemIndex !== index) })

  async function save(event) {
    event.preventDefault()
    setMessage('')
    if (draft.show_offer && Number(draft.original_price_paise) <= Number(draft.price_paise)) {
      return setMessage('Original price must be greater than the selling price when an offer is shown.')
    }
    setBusy(true)
    const { error } = await supabase.from('packages').update({
      name: draft.name.trim(),
      price_paise: Number(draft.price_paise),
      original_price_paise: draft.show_offer ? Number(draft.original_price_paise) : null,
      show_offer: Boolean(draft.show_offer),
      sale_enabled: Boolean(draft.sale_enabled),
      trial_days: draft.trial_days ? Number(draft.trial_days) : null,
      fixed_expires_on: draft.fixed_expires_on || null,
      quiz_attempt_fixed_limit: Number(draft.quiz_attempt_fixed_limit),
      quiz_attempts_per_chapter: null,
      display_features: draft.display_features,
    }).eq('id', draft.id)
    setBusy(false)
    if (error) return setMessage(error.message)
    setMessage(`${draft.name} updated. The landing page will use the new package details immediately.`)
    cancelEditing()
    load()
  }

  return <div>
    <PageTitle eyebrow="Configuration manager" title="Packages" text="Control package names, prices, offers, quiz limits, features and availability." />
    {message && <div className="card p-3 mb-5 bg-sky/20" role="status">{message}</div>}
    <div className="space-y-5">
      {packages.map(pkg => editingId === pkg.id
        ? <PackageEditor key={pkg.id} pkg={draft} change={change} featureText={featureText} setFeatureText={setFeatureText} addFeature={addFeature} removeFeature={removeFeature} save={save} cancel={cancelEditing} busy={busy} />
        : <PackageSummary key={pkg.id} pkg={pkg} onEdit={() => startEditing(pkg)} />)}
    </div>
  </div>
}

function PackageSummary({ pkg, onEdit }) {
  return <article className="card p-5 sm:p-6">
    <div className="flex flex-col sm:flex-row gap-5 justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h2 className="heading-display text-2xl">{pkg.name}</h2><span className={`chip text-xs ${pkg.sale_enabled ? 'bg-leaf/25' : 'bg-flame/15'}`}>{pkg.sale_enabled ? 'Available' : 'Hidden'}</span>{pkg.show_offer && <span className="chip text-xs bg-sun/30">Offer</span>}</div>
        <div className="flex items-baseline gap-2 mt-3">{pkg.show_offer && <span className="text-ink/45 line-through">{rupees(pkg.original_price_paise)}</span>}<span className="heading-display text-4xl">{rupees(pkg.price_paise)}</span></div>
        <div className="text-sm text-ink/60 mt-2">{pkg.quiz_attempt_fixed_limit || 0} maximum quiz attempts · {pkg.package_type === 'trial' ? `${pkg.trial_days} days` : `expires ${formatDate(pkg.fixed_expires_on)}`}</div>
      </div>
      <button type="button" className="btn-secondary self-start w-full sm:w-auto" onClick={onEdit}>Edit package</button>
    </div>
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-5 pt-5 border-t border-ink/15">
      {(pkg.display_features || []).map(feature => <div className="flex gap-2 text-sm" key={feature}><span className="text-green-700 font-bold">✓</span><span>{feature}</span></div>)}
      {!pkg.display_features?.length && <p className="text-sm text-ink/50">No landing-page features have been added.</p>}
    </div>
  </article>
}

function PackageEditor({ pkg, change, featureText, setFeatureText, addFeature, removeFeature, save, cancel, busy }) {
  return <form className="card p-5 sm:p-7 space-y-6 bg-violet/10" onSubmit={save}>
    <div className="flex items-start justify-between gap-3"><div><div className="font-mono text-xs uppercase tracking-widest text-ink/55">Editing {pkg.code}</div><h2 className="heading-display text-2xl mt-1">Package details</h2></div><button type="button" onClick={cancel} className="text-sm font-bold underline">Cancel</button></div>
    <div className="grid sm:grid-cols-2 gap-4"><Field label="Package name" value={pkg.name} onChange={value => change({ name: value })} /><Field label="Maximum quiz attempts" type="number" min="1" value={pkg.quiz_attempt_fixed_limit || ''} onChange={value => change({ quiz_attempt_fixed_limit: value })} /></div>
    <div className="grid sm:grid-cols-2 gap-4"><Field label="Selling price (₹)" type="number" min="0" value={Number(pkg.price_paise) / 100} onChange={value => change({ price_paise: toPaise(value) })} />{pkg.package_type === 'trial' ? <Field label="Trial duration (days)" type="number" min="1" value={pkg.trial_days || ''} onChange={value => change({ trial_days: value })} /> : <Field label="Package expiry date" type="date" value={pkg.fixed_expires_on || ''} onChange={value => change({ fixed_expires_on: value })} />}</div>
    <div className="rounded-2xl border-2 border-ink bg-paper p-4 space-y-4"><Check label="Show offer pricing" hint="Display an original price struck out beside the current selling price." checked={pkg.show_offer} onChange={checked => change({ show_offer: checked, original_price_paise: checked ? (pkg.original_price_paise || pkg.price_paise) : null })} />{pkg.show_offer && <Field label="Original price (₹)" type="number" min={(Number(pkg.price_paise) / 100) + 1} value={Number(pkg.original_price_paise || 0) / 100} onChange={value => change({ original_price_paise: toPaise(value) })} />}</div>
    <div><div className="font-display font-extrabold text-lg">Package features</div><p className="text-sm text-ink/55 mt-1">These appear on this package card on the landing page.</p><div className="flex flex-col sm:flex-row gap-2 mt-3"><input className="form-control flex-1 mt-0" placeholder="Type a feature, for example: Progress reports" value={featureText} maxLength="120" onChange={e => setFeatureText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }} /><button type="button" className="btn-secondary shrink-0" onClick={addFeature}>+ Add feature</button></div><div className="space-y-2 mt-3">{pkg.display_features.map((feature, index) => <div className="rounded-xl border-2 border-ink bg-paper px-3 py-2 flex items-center gap-3" key={`${feature}-${index}`}><span className="text-green-700 font-bold">✓</span><span className="flex-1 text-sm">{feature}</span><button type="button" aria-label={`Remove ${feature}`} className="w-8 h-8 rounded-lg hover:bg-flame/15 font-bold" onClick={() => removeFeature(index)}>×</button></div>)}</div></div>
    <Check label="Available for purchase" hint="Turning this off hides the package from new customers without affecting existing students." checked={pkg.sale_enabled} onChange={sale_enabled => change({ sale_enabled })} />
    <div className="grid sm:grid-cols-2 gap-3"><button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save package'}</button><button type="button" className="btn-secondary" onClick={cancel}>Cancel</button></div>
  </form>
}

function Field({ label, type = 'text', value, onChange, ...props }) { return <label className="block"><span className="block text-xs font-mono uppercase tracking-wider text-ink/60">{label}</span><input required className="form-control" type={type} value={value} onChange={e => onChange(e.target.value)} {...props} /></label> }
function Check({ label, hint, checked, onChange }) { return <label className="flex items-start gap-3 cursor-pointer"><input className="mt-1 w-5 h-5 accent-[#FFC857]" type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span><span className="font-bold block">{label}</span><span className="text-xs text-ink/55 block mt-0.5">{hint}</span></span></label> }
function formatDate(value) { if (!value) return 'not set'; return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
