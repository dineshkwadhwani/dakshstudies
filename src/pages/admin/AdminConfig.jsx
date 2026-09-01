import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { PageTitle } from './AdminSubjects.jsx'

export default function AdminConfig() {
  const [packages, setPackages] = useState([])
  const [message, setMessage] = useState('')
  async function load() { const { data, error } = await supabase.from('packages').select('*').order('rank'); if (error) setMessage(error.message); else setPackages(data || []) }
  useEffect(() => { load() }, [])
  async function save(pkg) { setMessage(''); const { error } = await supabase.from('packages').update({ name: pkg.name, price_paise: Number(pkg.price_paise), sale_enabled: pkg.sale_enabled, trial_days: pkg.trial_days ? Number(pkg.trial_days) : null, fixed_expires_on: pkg.fixed_expires_on || null }).eq('id', pkg.id); setMessage(error ? error.message : `${pkg.name} updated.`); if (!error) load() }
  const change = (id, values) => setPackages(items => items.map(item => item.id === id ? { ...item, ...values } : item))
  return <div><PageTitle eyebrow="Configuration manager" title="Packages" text="Edit pricing and control which packages are available for new purchases." />{message && <div className="card p-3 mb-4 bg-sky/20">{message}</div>}<div className="grid md:grid-cols-3 gap-3">{packages.map(pkg => <div className="card p-4 space-y-3" key={pkg.id}><input value={pkg.name} onChange={e => change(pkg.id, { name: e.target.value })} /><label className="block text-xs">Price (₹)<input type="number" value={pkg.price_paise / 100} onChange={e => change(pkg.id, { price_paise: Number(e.target.value) * 100 })} /></label>{pkg.code === 'FREE' ? <label className="block text-xs">Trial days<input type="number" value={pkg.trial_days || ''} onChange={e => change(pkg.id, { trial_days: e.target.value })} /></label> : <label className="block text-xs">Expiry date<input type="date" value={pkg.fixed_expires_on || ''} onChange={e => change(pkg.id, { fixed_expires_on: e.target.value })} /></label>}<label className="flex items-center gap-2"><input type="checkbox" checked={pkg.sale_enabled} onChange={e => change(pkg.id, { sale_enabled: e.target.checked })} /> Available for purchase</label><button className="btn-primary w-full" onClick={() => save(pkg)}>Save</button></div>)}</div></div>
}

