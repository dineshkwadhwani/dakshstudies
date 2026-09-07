import { INDIAN_CITIES } from '../data/indianCities.js'

export default function CitySelect({ value, onChange, required = true, label = 'City' }) {
  const savedCityIsCustom = value && !INDIAN_CITIES.includes(value)
  return <label className="block">
    <span className="text-xs font-mono uppercase tracking-wider text-ink/60">
      {label} {required ? <span className="text-flame" aria-hidden="true">*</span> : <span className="normal-case">(optional)</span>}
    </span>
    <select
      required={required}
      value={value}
      onChange={event => onChange(event.target.value)}
      autoComplete="address-level2"
      className="form-control"
    >
      <option value="">Select your city</option>
      {savedCityIsCustom && <option value={value}>{value}</option>}
      {INDIAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
    </select>
  </label>
}
